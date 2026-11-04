-- Tài sản → tab Tài sản được cấp (/app/assets?tab=issued, frontend-spec 4.18; chủ dự án chốt 03/11/2026).
-- - issued_assets: phần mềm, thiết bị của công ty (mã, tên, loại, trạng thái, ngày hết hạn). Không lưu key bản
--   quyền hay mật khẩu.
-- - asset_assignments: lịch sử cấp / thu hồi. Đối tượng sử dụng là một nhân viên, một phòng ban hoặc cả công ty;
--   người cấp là một nhân viên (chọn được, không bắt buộc là người nhập). Mỗi tài sản tối đa 1 lượt cấp đang mở.
-- - Ghi qua RPC, chỉ Super Admin / HR Admin; mỗi thao tác ghi audit_logs (resource_type 'issued_assets') cùng
--   giao dịch. Ai xem được tài sản nào do API lọc (modules/assets).
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261023090000_executive_overview.sql') then
    raise exception 'Chạy 20261023090000_executive_overview.sql trước';
  end if;
end;
$$;

-- ---------- Bảng ----------

create table if not exists public.issued_assets (
  id uuid primary key default gen_random_uuid(),
  code text constraint issued_assets_code_check
    check (code = btrim(code) and char_length(code) between 1 and 40),
  name text not null constraint issued_assets_name_check
    check (name = btrim(name) and char_length(name) between 1 and 120),
  category text not null constraint issued_assets_category_check
    check (category in ('laptop', 'phone', 'monitor', 'sim', 'access_card', 'software', 'other')),
  -- 'issued' chỉ do RPC cấp / thu hồi đặt, khớp với lượt cấp đang mở.
  status text not null default 'in_stock' constraint issued_assets_status_check
    check (status in ('in_stock', 'issued', 'repair', 'disposed')),
  expires_on date,
  note text constraint issued_assets_note_check check (char_length(note) <= 2000),
  archived_at timestamptz,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Mã không trùng (không phân biệt hoa thường) giữa các tài sản chưa xoá; mã để trống thì không xét.
create unique index if not exists issued_assets_code_key
  on public.issued_assets (lower(code)) where archived_at is null and code is not null;
create index if not exists issued_assets_list_idx on public.issued_assets (archived_at, category, status);

create table if not exists public.asset_assignments (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.issued_assets(id) on delete restrict,
  holder_type text not null constraint asset_assignments_holder_type_check
    check (holder_type in ('employee', 'department', 'company')),
  employee_id uuid references public.employees(id) on delete restrict,
  department_id uuid references public.departments(id) on delete restrict,
  issuer_employee_id uuid not null references public.employees(id) on delete restrict,
  issued_on date not null,
  note text constraint asset_assignments_note_check check (char_length(note) <= 2000),
  returned_on date,
  returned_by uuid references public.app_accounts(id) on delete restrict,
  return_note text constraint asset_assignments_return_note_check check (char_length(return_note) <= 2000),
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Đúng một cột đối tượng theo loại: nhân viên → employee_id, phòng → department_id, công ty → không cột nào.
  constraint asset_assignments_holder_check check (
    (holder_type = 'employee' and employee_id is not null and department_id is null)
    or (holder_type = 'department' and department_id is not null and employee_id is null)
    or (holder_type = 'company' and employee_id is null and department_id is null)),
  constraint asset_assignments_dates_check check (returned_on is null or returned_on >= issued_on)
);
create unique index if not exists asset_assignments_open_key
  on public.asset_assignments (asset_id) where returned_on is null;
create index if not exists asset_assignments_asset_idx on public.asset_assignments (asset_id, issued_on);
create index if not exists asset_assignments_employee_idx
  on public.asset_assignments (employee_id) where returned_on is null;
create index if not exists asset_assignments_department_idx
  on public.asset_assignments (department_id) where returned_on is null;

drop trigger if exists issued_assets_updated_at on public.issued_assets;
create trigger issued_assets_updated_at before update on public.issued_assets
  for each row execute function app_private.set_updated_at();
drop trigger if exists asset_assignments_updated_at on public.asset_assignments;
create trigger asset_assignments_updated_at before update on public.asset_assignments
  for each row execute function app_private.set_updated_at();

-- ---------- View đọc ----------

-- Lượt cấp kèm tên đối tượng và người cấp (lịch sử, và lượt đang mở cho danh sách).
create or replace view public.asset_assignment_rows with (security_invoker = true) as
select a.id, a.asset_id, a.holder_type, a.employee_id, he.full_name as employee_name,
  he.archived_at is not null as employee_archived, he.department_id as employee_department_id,
  a.department_id, hd.name as department_name, a.issuer_employee_id, ie.full_name as issuer_name,
  ie.archived_at is not null as issuer_archived, a.issued_on, a.note, a.returned_on, a.return_note, a.created_at
from public.asset_assignments a
join public.employees ie on ie.id = a.issuer_employee_id
left join public.employees he on he.id = a.employee_id
left join public.departments hd on hd.id = a.department_id;

-- Danh sách: tài sản + lượt cấp đang mở (mỗi tài sản tối đa một — index asset_assignments_open_key). Cột đối
-- tượng / người cấp cùng tên với asset_assignment_rows; employee_id, department_id là của đối tượng đang dùng.
create or replace view public.issued_asset_summaries with (security_invoker = true) as
select i.id, i.code, i.name, i.category, i.status, i.expires_on, i.note, i.archived_at, i.updated_at,
  r.id as assignment_id, r.holder_type, r.employee_id, r.employee_name, r.employee_archived,
  r.department_id, r.department_name, r.issuer_employee_id, r.issuer_name, r.issuer_archived,
  r.issued_on, r.note as issue_note
from public.issued_assets i
left join public.asset_assignment_rows r on r.asset_id = i.id and r.returned_on is null;

-- ---------- Hàm nội bộ ----------

create or replace function app_private.crm_asset_actor(actor_uuid uuid) returns uuid
language sql security definer set search_path = '' as $$
  select app_private.crm_actor(actor_uuid, array['super_admin', 'hr_admin']);
$$;

create or replace function app_private.crm_assert_asset_person(employee_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.employees where id = employee_uuid and archived_at is null) then
    raise exception 'ASSET_PERSON_NOT_FOUND';
  end if;
end;
$$;

create or replace function app_private.crm_lock_issued_asset(asset_uuid uuid)
returns public.issued_assets language plpgsql security definer set search_path = '' as $$
declare asset_row public.issued_assets;
begin
  select * into asset_row from public.issued_assets
  where id = asset_uuid and archived_at is null for update;
  if not found then raise exception 'ASSET_NOT_FOUND'; end if;
  return asset_row;
end;
$$;

create or replace function app_private.crm_issued_asset_json(asset_row public.issued_assets) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('code', asset_row.code, 'name', asset_row.name, 'category', asset_row.category,
    'status', asset_row.status, 'expiresOn', asset_row.expires_on, 'note', asset_row.note);
$$;

create or replace function app_private.crm_log_issued_asset(
  actor_id uuid, asset_uuid uuid, activity text, old_json jsonb, new_json jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, old_values,
    new_values, created_by)
  values (actor_id, activity, 'issued_assets', asset_uuid, old_json, new_json, actor_id);
$$;

-- Mở lượt cấp cho tài sản đã khoá. `assignment`: holderType ('employee' | 'department' | 'company'), employeeId,
-- departmentId, issuerEmployeeId, issuedOn (yyyy-mm-dd), note. Chỉ cấp tài sản đang Trong kho; đối tượng và người
-- cấp phải còn hoạt động.
create or replace function app_private.crm_open_assignment(
  actor_id uuid, asset_row public.issued_assets, assignment jsonb
) returns uuid language plpgsql security definer set search_path = '' as $$
declare new_row public.asset_assignments;
  holder_kind text := assignment ->> 'holderType';
  employee_uuid uuid := case when holder_kind = 'employee' then (assignment ->> 'employeeId')::uuid end;
  department_uuid uuid := case when holder_kind = 'department' then (assignment ->> 'departmentId')::uuid end;
begin
  if asset_row.status <> 'in_stock' then raise exception 'ASSET_NOT_AVAILABLE'; end if;
  if employee_uuid is not null then perform app_private.crm_assert_asset_person(employee_uuid); end if;
  if department_uuid is not null then perform app_private.crm_lock_active_department(department_uuid); end if;
  perform app_private.crm_assert_asset_person((assignment ->> 'issuerEmployeeId')::uuid);
  insert into public.asset_assignments (asset_id, holder_type, employee_id, department_id,
    issuer_employee_id, issued_on, note, created_by)
  values (asset_row.id, holder_kind, employee_uuid, department_uuid, (assignment ->> 'issuerEmployeeId')::uuid,
    (assignment ->> 'issuedOn')::date, nullif(btrim(assignment ->> 'note'), ''), actor_id)
  returning * into new_row;
  update public.issued_assets set status = 'issued' where id = asset_row.id;
  perform app_private.crm_log_issued_asset(actor_id, asset_row.id, 'asset.issue', null,
    jsonb_build_object('assignmentId', new_row.id, 'holderType', holder_kind, 'employeeId', employee_uuid,
      'departmentId', department_uuid, 'issuerEmployeeId', new_row.issuer_employee_id,
      'issuedOn', new_row.issued_on));
  return new_row.id;
end;
$$;

-- ---------- RPC: tài sản ----------

-- Trạng thái 'issued' chỉ có được khi cấp; tạo / sửa tay không đặt được. Có `assignment` → cấp luôn cho đối tượng
-- đó trong cùng giao dịch (lỗi cấp thì không tạo tài sản).
create or replace function public.crm_create_issued_asset(
  actor_uuid uuid, asset_code text, asset_name text, asset_category text, asset_status text,
  asset_expires_on date default null, asset_note text default null, assignment jsonb default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; asset_row public.issued_assets;
begin
  actor_id := app_private.crm_asset_actor(actor_uuid);
  if asset_status = 'issued' then raise exception 'ASSET_STATUS_LOCKED'; end if;
  insert into public.issued_assets (code, name, category, status, expires_on, note, created_by)
  values (nullif(btrim(asset_code), ''), btrim(asset_name), asset_category, coalesce(asset_status, 'in_stock'),
    asset_expires_on, nullif(btrim(asset_note), ''), actor_id)
  returning * into asset_row;
  perform app_private.crm_log_issued_asset(actor_id, asset_row.id, 'asset.create', null,
    app_private.crm_issued_asset_json(asset_row));
  if assignment is not null then
    perform app_private.crm_open_assignment(actor_id, asset_row, assignment);
  end if;
  return asset_row.id;
end;
$$;

-- PATCH: chỉ đổi khoá có trong `changes` (code, name, category, status, expiresOn, note); null = xoá giá trị.
-- Đang cấp thì không đổi trạng thái tay (thu hồi trước); không đặt tay sang 'issued'.
create or replace function public.crm_update_issued_asset(actor_uuid uuid, asset_uuid uuid, changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.issued_assets; new_row public.issued_assets;
begin
  actor_id := app_private.crm_asset_actor(actor_uuid);
  old_row := app_private.crm_lock_issued_asset(asset_uuid);
  if changes ? 'status' and changes ->> 'status' is distinct from old_row.status
    and (old_row.status = 'issued' or changes ->> 'status' = 'issued') then
    raise exception 'ASSET_STATUS_LOCKED';
  end if;
  update public.issued_assets set
    code = case when changes ? 'code' then nullif(btrim(changes ->> 'code'), '') else code end,
    name = case when changes ? 'name' then btrim(changes ->> 'name') else name end,
    category = case when changes ? 'category' then changes ->> 'category' else category end,
    status = case when changes ? 'status' then changes ->> 'status' else status end,
    expires_on = case when changes ? 'expiresOn' then (changes ->> 'expiresOn')::date else expires_on end,
    note = case when changes ? 'note' then nullif(btrim(changes ->> 'note'), '') else note end
  where id = asset_uuid
  returning * into new_row;
  if app_private.crm_issued_asset_json(old_row) <> app_private.crm_issued_asset_json(new_row) then
    perform app_private.crm_log_issued_asset(actor_id, asset_uuid, 'asset.update',
      app_private.crm_issued_asset_json(old_row), app_private.crm_issued_asset_json(new_row));
  end if;
end;
$$;

-- Xoá = lưu trữ; tài sản đang cấp phải thu hồi trước. Lịch sử cấp giữ nguyên.
create or replace function public.crm_archive_issued_asset(actor_uuid uuid, asset_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; asset_row public.issued_assets;
begin
  actor_id := app_private.crm_asset_actor(actor_uuid);
  asset_row := app_private.crm_lock_issued_asset(asset_uuid);
  if asset_row.status = 'issued' then raise exception 'ASSET_IN_USE'; end if;
  update public.issued_assets set archived_at = now() where id = asset_uuid;
  perform app_private.crm_log_issued_asset(actor_id, asset_uuid, 'asset.archive', null,
    jsonb_build_object('name', asset_row.name));
end;
$$;

-- ---------- RPC: cấp / thu hồi ----------

-- Cấp tài sản đã có (nút [Cấp]); `assignment` như crm_open_assignment.
create or replace function public.crm_issue_asset(actor_uuid uuid, asset_uuid uuid, assignment jsonb)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid;
begin
  actor_id := app_private.crm_asset_actor(actor_uuid);
  return app_private.crm_open_assignment(actor_id, app_private.crm_lock_issued_asset(asset_uuid), assignment);
end;
$$;

-- Thu hồi lượt cấp đang mở: ghi ngày trả (không trước ngày cấp), tài sản về Trong kho.
create or replace function public.crm_return_asset(
  actor_uuid uuid, asset_uuid uuid, return_date date, return_reason text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; open_row public.asset_assignments;
begin
  actor_id := app_private.crm_asset_actor(actor_uuid);
  perform app_private.crm_lock_issued_asset(asset_uuid);
  select * into open_row from public.asset_assignments
  where asset_id = asset_uuid and returned_on is null for update;
  if not found then raise exception 'ASSET_NOT_ISSUED'; end if;
  update public.asset_assignments set returned_on = return_date, returned_by = actor_id,
    return_note = nullif(btrim(return_reason), '')
  where id = open_row.id;
  update public.issued_assets set status = 'in_stock' where id = asset_uuid;
  perform app_private.crm_log_issued_asset(actor_id, asset_uuid, 'asset.return', null,
    jsonb_build_object('assignmentId', open_row.id, 'returnedOn', return_date));
end;
$$;

-- ---------- Quyền DB ----------

alter table public.issued_assets enable row level security;
alter table public.asset_assignments enable row level security;

-- API chỉ đọc trực tiếp; mọi thao tác ghi qua RPC (ghi audit cùng giao dịch).
revoke all on public.issued_assets, public.asset_assignments from public, anon, authenticated, service_role;
grant select on public.issued_assets, public.asset_assignments to service_role;
revoke all on public.issued_asset_summaries, public.asset_assignment_rows from public, anon, authenticated;
grant select on public.issued_asset_summaries, public.asset_assignment_rows to service_role;

do $$
declare signature text;
begin
  foreach signature in array array[
    'app_private.crm_asset_actor(uuid)',
    'app_private.crm_assert_asset_person(uuid)',
    'app_private.crm_lock_issued_asset(uuid)',
    'app_private.crm_issued_asset_json(public.issued_assets)',
    'app_private.crm_log_issued_asset(uuid, uuid, text, jsonb, jsonb)',
    'app_private.crm_open_assignment(uuid, public.issued_assets, jsonb)'] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
  end loop;
  foreach signature in array array[
    'public.crm_create_issued_asset(uuid, text, text, text, text, date, text, jsonb)',
    'public.crm_update_issued_asset(uuid, uuid, jsonb)',
    'public.crm_archive_issued_asset(uuid, uuid)',
    'public.crm_issue_asset(uuid, uuid, jsonb)',
    'public.crm_return_asset(uuid, uuid, date, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261103090000_issued_assets.sql')
on conflict (name) do nothing;

commit;
