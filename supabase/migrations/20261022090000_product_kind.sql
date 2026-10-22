-- Tài sản → Sản phẩm: thêm Loại sản phẩm (chủ dự án chốt 22/10/2026) — tách khỏi Trạng thái để sản phẩm hợp tác
-- vẫn ghi được Đang hoạt động / Tạm ngừng…
-- - products.kind: 'company' (Sản phẩm công ty, mặc định — mọi sản phẩm cũ) · 'partner' (Website doanh nghiệp hợp tác).
-- - View product_summaries thêm cột kind (cuối view); audit ghi kind; RPC tạo nhận product_kind, RPC sửa nhận
--   khoá 'kind'.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261018090000_products.sql') then
    raise exception 'Chạy 20261018090000_products.sql trước';
  end if;
end;
$$;

alter table public.products add column if not exists kind text not null default 'company';
alter table public.products drop constraint if exists products_kind_check;
alter table public.products add constraint products_kind_check check (kind in ('company', 'partner'));

-- Thêm cột ở cuối: create or replace view không cho chèn cột vào giữa.
create or replace view public.product_summaries with (security_invoker = true) as
select p.id, p.department_id, d.name as department_name, d.archived_at as department_archived_at,
  p.project_id, pr.name as project_name, p.name, p.url, p.description, p.status, p.archived_at,
  p.created_at, p.updated_at, p.owner_employee_id, o.full_name as owner_name,
  o.archived_at is not null as owner_archived,
  coalesce((select jsonb_agg(jsonb_build_object('id', e.id, 'name', e.full_name,
      'isArchived', e.archived_at is not null) order by e.full_name, e.id)
    from public.product_members m join public.employees e on e.id = m.employee_id
    where m.product_id = p.id), '[]'::jsonb) as members,
  p.kind
from public.products p
join public.departments d on d.id = p.department_id
join public.employees o on o.id = p.owner_employee_id
left join public.projects pr on pr.id = p.project_id;

create or replace function app_private.crm_product_json(product_row public.products) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('name', product_row.name, 'url', product_row.url,
    'description', product_row.description, 'status', product_row.status, 'kind', product_row.kind,
    'ownerEmployeeId', product_row.owner_employee_id, 'projectId', product_row.project_id);
$$;

-- Thêm tham số product_kind (có mặc định) → bỏ bản 9 tham số để không có hai hàm trùng tên. API cũ gọi theo tên
-- tham số, không gửi product_kind vẫn chạy (sản phẩm công ty).
drop function if exists public.crm_create_product(uuid, uuid, text, text, text, text, uuid, uuid, uuid[]);
create function public.crm_create_product(
  actor_uuid uuid, department_uuid uuid, product_name text, product_url text, product_description text,
  product_status text, owner_uuid uuid, project_uuid uuid default null, member_uuids uuid[] default '{}',
  product_kind text default 'company'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; product_row public.products;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_active_department(department_uuid);
  perform app_private.crm_assert_product_person(owner_uuid);
  -- Dự án còn hoạt động và cùng phòng (dùng lại kiểm tra của task — BR-30).
  perform app_private.crm_assert_task_project(department_uuid, project_uuid);
  insert into public.products (department_id, project_id, name, url, description, status, kind,
    owner_employee_id, created_by)
  values (department_uuid, project_uuid, btrim(product_name), btrim(product_url),
    nullif(btrim(product_description), ''), coalesce(product_status, 'developing'),
    coalesce(product_kind, 'company'), owner_uuid, actor_id)
  returning * into product_row;
  perform app_private.crm_log_product(actor_id, product_row.id, 'product.create', null,
    app_private.crm_product_json(product_row) || jsonb_build_object('departmentId', department_uuid));
  perform app_private.crm_put_product_members(product_row, actor_id, member_uuids);
  return product_row.id;
end;
$$;

-- PATCH: chỉ đổi khoá có trong `changes` (name, url, description, status, kind, ownerEmployeeId, projectId,
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
    kind = case when changes ? 'kind' then changes ->> 'kind' else kind end,
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

-- ---------- Quyền DB (view và hàm tạo lại phải cấp lại) ----------

revoke all on public.product_summaries from public, anon, authenticated;
grant select on public.product_summaries to service_role;
revoke all on function app_private.crm_product_json(public.products)
  from public, anon, authenticated, service_role;
revoke all on function
  public.crm_create_product(uuid, uuid, text, text, text, text, uuid, uuid, uuid[], text)
  from public, anon, authenticated;
grant execute on function
  public.crm_create_product(uuid, uuid, text, text, text, text, uuid, uuid, uuid[], text) to service_role;

insert into app_private.applied_migrations (name)
values ('20261022090000_product_kind.sql')
on conflict (name) do nothing;

commit;
