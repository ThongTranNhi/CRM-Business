-- Tài sản → tab Sản phẩm (/app/assets, chủ dự án chốt 17/10/2026): sản phẩm công ty làm ra / sở hữu.
-- - products: thuộc 1 phòng ban, có link (chỉ http/https), mô tả, trạng thái, 1 người phụ trách chính, dự án liên
--   quan cùng phòng (khoá ngoại ghép như task — BR-30). product_members: người cùng phụ trách (mọi phòng).
-- - View product_summaries; RPC tạo / sửa / lưu trữ ghi audit_logs (resource_type 'products') cùng giao dịch.
-- Quyền theo vai trò kiểm tra ở API (modules/assets); RPC kiểm tra toàn vẹn dữ liệu. Tab Tài sản được cấp làm sau.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261017090000_my_task_status_filter.sql') then
    raise exception 'Chạy 20261017090000_my_task_status_filter.sql trước';
  end if;
end;
$$;

-- ---------- Bảng ----------

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  project_id uuid,
  name text not null constraint products_name_check
    check (name = btrim(name) and char_length(name) between 1 and 120),
  -- Chỉ http(s): link được mở bằng thẻ <a>, không cho javascript: hay data:.
  url text not null constraint products_url_check
    check (url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 2000),
  description text constraint products_description_check check (char_length(description) <= 2000),
  status text not null default 'developing' constraint products_status_check
    check (status in ('developing', 'active', 'paused', 'discontinued')),
  owner_employee_id uuid not null references public.employees(id) on delete restrict,
  archived_at timestamptz,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint products_project_department_fk foreign key (project_id, department_id)
    references public.projects (id, department_id) on delete restrict
);
-- Tên không trùng trong một phòng (không phân biệt hoa thường), chỉ xét sản phẩm chưa lưu trữ.
create unique index if not exists products_department_name_key
  on public.products (department_id, lower(name)) where archived_at is null;
create index if not exists products_department_idx on public.products (department_id, archived_at);
create index if not exists products_owner_idx on public.products (owner_employee_id);
create index if not exists products_project_idx on public.products (project_id);

create table if not exists public.product_members (
  product_id uuid not null references public.products(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (product_id, employee_id)
);
create index if not exists product_members_employee_idx on public.product_members (employee_id);

drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products
  for each row execute function app_private.set_updated_at();
drop trigger if exists product_members_updated_at on public.product_members;
create trigger product_members_updated_at before update on public.product_members
  for each row execute function app_private.set_updated_at();

-- ---------- View đọc ----------

-- Danh sách: sản phẩm + phòng, dự án, người phụ trách chính, người cùng phụ trách (một truy vấn, không N+1).
create or replace view public.product_summaries with (security_invoker = true) as
select p.id, p.department_id, d.name as department_name, d.archived_at as department_archived_at,
  p.project_id, pr.name as project_name, p.name, p.url, p.description, p.status, p.archived_at,
  p.created_at, p.updated_at, p.owner_employee_id, o.full_name as owner_name,
  o.archived_at is not null as owner_archived,
  coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.full_name,
      'isArchived', e.archived_at is not null) order by e.full_name, e.id)
    from public.product_members m join public.employees e on e.id = m.employee_id
    where m.product_id = p.id), '[]'::jsonb) as members
from public.products p
join public.departments d on d.id = p.department_id
join public.employees o on o.id = p.owner_employee_id
left join public.projects pr on pr.id = p.project_id;

-- ---------- Hàm nội bộ ----------

-- Người phụ trách (chính / cùng phụ trách): nhân viên chưa xoá, phòng nào cũng được.
create or replace function app_private.crm_assert_product_person(employee_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.employees where id = employee_uuid and archived_at is null) then
    raise exception 'PRODUCT_PERSON_NOT_FOUND';
  end if;
end;
$$;

-- Khoá sản phẩm chưa lưu trữ và phòng của nó (phòng đã xoá → DEPARTMENT_NOT_FOUND).
create or replace function app_private.crm_lock_product(product_uuid uuid)
returns public.products language plpgsql security definer set search_path = '' as $$
declare product_row public.products;
begin
  select * into product_row from public.products
  where id = product_uuid and archived_at is null for update;
  if not found then raise exception 'PRODUCT_NOT_FOUND'; end if;
  perform app_private.crm_lock_active_department(product_row.department_id);
  return product_row;
end;
$$;

create or replace function app_private.crm_product_json(product_row public.products) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('name', product_row.name, 'url', product_row.url,
    'description', product_row.description, 'status', product_row.status,
    'ownerEmployeeId', product_row.owner_employee_id, 'projectId', product_row.project_id);
$$;

create or replace function app_private.crm_log_product(
  actor_id uuid, product_uuid uuid, activity text, old_json jsonb, new_json jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, old_values,
    new_values, created_by)
  values (actor_id, activity, 'products', product_uuid, old_json, new_json, actor_id);
$$;

-- Đặt người cùng phụ trách (không gồm người phụ trách chính). Chỉ người MỚI thêm phải còn làm việc: người cũ đã
-- nghỉ vẫn giữ hoặc gỡ được. Ghi audit khi danh sách thực sự đổi.
create or replace function app_private.crm_put_product_members(
  product_row public.products, actor_id uuid, employee_uuids uuid[]
) returns void language plpgsql security definer set search_path = '' as $$
declare old_ids uuid[]; new_ids uuid[]; employee_uuid uuid;
begin
  new_ids := app_private.crm_distinct_ids(array_remove(
    array_remove(coalesce(employee_uuids, '{}'), product_row.owner_employee_id), null));
  old_ids := app_private.crm_distinct_ids(array(select employee_id from public.product_members
    where product_id = product_row.id));
  if new_ids = old_ids then return; end if;
  foreach employee_uuid in array new_ids loop
    if not (employee_uuid = any (old_ids)) then
      perform app_private.crm_assert_product_person(employee_uuid);
    end if;
  end loop;
  delete from public.product_members where product_id = product_row.id and employee_id <> all (new_ids);
  insert into public.product_members (product_id, employee_id, created_by)
  select product_row.id, id, actor_id from unnest(new_ids) as id
  on conflict (product_id, employee_id) do nothing;
  perform app_private.crm_log_product(actor_id, product_row.id, 'product.members',
    jsonb_build_object('employeeIds', old_ids), jsonb_build_object('employeeIds', new_ids));
end;
$$;

-- ---------- RPC ----------

create or replace function public.crm_create_product(
  actor_uuid uuid, department_uuid uuid, product_name text, product_url text, product_description text,
  product_status text, owner_uuid uuid, project_uuid uuid default null, member_uuids uuid[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; product_row public.products;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_active_department(department_uuid);
  perform app_private.crm_assert_product_person(owner_uuid);
  -- Dự án còn hoạt động và cùng phòng (dùng lại kiểm tra của task — BR-30).
  perform app_private.crm_assert_task_project(department_uuid, project_uuid);
  insert into public.products (department_id, project_id, name, url, description, status,
    owner_employee_id, created_by)
  values (department_uuid, project_uuid, btrim(product_name), btrim(product_url),
    nullif(btrim(product_description), ''), coalesce(product_status, 'developing'), owner_uuid, actor_id)
  returning * into product_row;
  perform app_private.crm_log_product(actor_id, product_row.id, 'product.create', null,
    app_private.crm_product_json(product_row) || jsonb_build_object('departmentId', department_uuid));
  perform app_private.crm_put_product_members(product_row, actor_id, member_uuids);
  return product_row.id;
end;
$$;

-- PATCH: chỉ đổi khoá có trong `changes` (name, url, description, status, ownerEmployeeId, projectId,
-- memberIds); description / projectId null = xoá giá trị. Không đổi phòng ban của sản phẩm.
create or replace function public.crm_update_product(actor_uuid uuid, product_uuid uuid, changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.products; new_row public.products; owner_uuid uuid; project_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  old_row := app_private.crm_lock_product(product_uuid);
  owner_uuid := (changes ->> 'ownerEmployeeId')::uuid;
  if changes ? 'ownerEmployeeId' and owner_uuid is distinct from old_row.owner_employee_id then
    perform app_private.crm_assert_product_person(owner_uuid);
  end if;
  project_uuid := (changes ->> 'projectId')::uuid;
  if changes ? 'projectId' and project_uuid is distinct from old_row.project_id then
    perform app_private.crm_assert_task_project(old_row.department_id, project_uuid);
  end if;
  update public.products set
    name = case when changes ? 'name' then btrim(changes ->> 'name') else name end,
    url = case when changes ? 'url' then btrim(changes ->> 'url') else url end,
    description = case when changes ? 'description'
      then nullif(btrim(changes ->> 'description'), '') else description end,
    status = case when changes ? 'status' then changes ->> 'status' else status end,
    owner_employee_id = coalesce(owner_uuid, owner_employee_id),
    project_id = case when changes ? 'projectId' then project_uuid else project_id end
  where id = product_uuid
  returning * into new_row;
  if app_private.crm_product_json(old_row) <> app_private.crm_product_json(new_row) then
    perform app_private.crm_log_product(actor_id, product_uuid, 'product.update',
      app_private.crm_product_json(old_row), app_private.crm_product_json(new_row));
  end if;
  -- Người phụ trách chính mới không đồng thời là người cùng phụ trách.
  perform app_private.crm_put_product_members(new_row, actor_id,
    case when changes ? 'memberIds'
      then array(select jsonb_array_elements_text(changes -> 'memberIds')::uuid)
      else array(select employee_id from public.product_members where product_id = product_uuid) end);
end;
$$;

-- Xoá = lưu trữ (không xoá dòng): sản phẩm ẩn khỏi danh sách, lịch sử giữ trong audit_logs.
create or replace function public.crm_archive_product(actor_uuid uuid, product_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; product_row public.products;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  product_row := app_private.crm_lock_product(product_uuid);
  update public.products set archived_at = now() where id = product_uuid;
  perform app_private.crm_log_product(actor_id, product_uuid, 'product.archive', null,
    jsonb_build_object('name', product_row.name));
end;
$$;

-- ---------- Quyền DB ----------

alter table public.products enable row level security;
alter table public.product_members enable row level security;

-- API chỉ đọc trực tiếp; mọi thao tác ghi qua RPC (ghi audit cùng giao dịch).
revoke all on public.products, public.product_members from public, anon, authenticated, service_role;
grant select on public.products, public.product_members to service_role;
revoke all on public.product_summaries from public, anon, authenticated;
grant select on public.product_summaries to service_role;

do $$
declare signature text;
begin
  foreach signature in array array[
    'app_private.crm_assert_product_person(uuid)',
    'app_private.crm_lock_product(uuid)',
    'app_private.crm_product_json(public.products)',
    'app_private.crm_log_product(uuid, uuid, text, jsonb, jsonb)',
    'app_private.crm_put_product_members(public.products, uuid, uuid[])'] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
  end loop;
  foreach signature in array array[
    'public.crm_create_product(uuid, uuid, text, text, text, text, uuid, uuid, uuid[])',
    'public.crm_update_product(uuid, uuid, jsonb)',
    'public.crm_archive_product(uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261018090000_products.sql')
on conflict (name) do nothing;

commit;
