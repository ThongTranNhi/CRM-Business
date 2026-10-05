-- Xoá mềm / khôi phục nhân viên (BR-53): khoá tài khoản, thu hồi phiên, gỡ chức trưởng phòng, audit.
-- View employee_directory (mọi hồ sơ) và active_employees (chưa xoá) là nguồn đọc cho danh sách và ô chọn.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090200_department_management_rpcs.sql') then
    raise exception 'Chạy 20261006090200_department_management_rpcs.sql trước';
  end if;
end;
$$;

-- Mã nhân viên chỉ cần không trùng giữa người đang làm; mã của người đã xoá được dùng lại.
drop index if exists public.employees_code_unique;
create unique index if not exists employees_active_code_unique
  on public.employees (lower(employee_code)) where archived_at is null;
create index if not exists employees_archived_idx on public.employees (archived_at);

create or replace view public.employee_directory with (security_invoker = true) as
select
  e.id,
  e.full_name,
  e.employee_code,
  e.job_title,
  e.department_id,
  d.name as department_name,
  d.manager_employee_id as department_manager_id,
  m.full_name as department_manager_name,
  e.avatar_path,
  e.employment_status,
  a.auth_user_id,
  a.username,
  a.role,
  a.status as account_status,
  coalesce(a.status <> 'active', false) as is_locked,
  e.archived_at,
  e.created_at
from public.employees e
left join public.departments d on d.id = e.department_id
left join public.employees m on m.id = d.manager_employee_id
left join public.app_accounts a on a.id = e.account_id;

create or replace view public.active_employees with (security_invoker = true) as
select
  id, full_name, employee_code, job_title, department_id, department_name,
  department_manager_id, department_manager_name, avatar_path, employment_status, auth_user_id,
  username, role, account_status, is_locked, created_at
from public.employee_directory
where archived_at is null;

revoke all on public.employee_directory, public.active_employees from public, anon, authenticated;
grant select on public.employee_directory, public.active_employees to service_role;

create or replace function public.crm_delete_employee(
  actor_uuid uuid, employee_uuid uuid, new_manager_uuid uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid; target_account uuid; target_role text; target_user uuid; managed_department uuid;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin']);
  select e.account_id, a.role, a.auth_user_id into target_account, target_role, target_user
  from public.employees e left join public.app_accounts a on a.id = e.account_id
  where e.id = employee_uuid and e.archived_at is null for update of e;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if target_account = actor_id then raise exception 'CANNOT_DELETE_SELF'; end if;
  if target_role = 'super_admin' then raise exception 'CANNOT_DELETE_ADMIN'; end if;
  if new_manager_uuid = employee_uuid then raise exception 'INVALID_REPLACEMENT_MANAGER'; end if;

  select id into managed_department from public.departments
  where manager_employee_id = employee_uuid and archived_at is null for update;
  if managed_department is not null then
    update public.departments set manager_employee_id = null where id = managed_department;
    if new_manager_uuid is not null then
      perform app_private.crm_assign_manager(managed_department, new_manager_uuid);
    end if;
  end if;

  update public.employees set archived_at = now() where id = employee_uuid;
  if target_account is not null then
    update public.app_accounts set status = 'disabled' where id = target_account;
    delete from auth.sessions where user_id = target_user;
  end if;
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
  values (actor_id, 'employee.delete', 'employees', employee_uuid,
    jsonb_build_object('managedDepartmentId', managed_department, 'newManagerId', new_manager_uuid),
    actor_id);
end;
$$;

-- Mở lại tài khoản, không gán lại chức trưởng phòng; phòng cũ đã xoá thì để "Chưa gán".
create or replace function public.crm_restore_employee(actor_uuid uuid, employee_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; target_account uuid; target_code text; target_department uuid;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin']);
  select account_id, employee_code, department_id into target_account, target_code, target_department
  from public.employees where id = employee_uuid and archived_at is not null for update;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if target_code is not null and exists (select 1 from public.employees
    where lower(employee_code) = lower(target_code) and archived_at is null) then
    raise exception 'EMPLOYEE_CODE_EXISTS';
  end if;
  update public.employees set archived_at = null,
    department_id = case when exists (select 1 from public.departments
      where id = target_department and archived_at is null) then target_department end
  where id = employee_uuid;
  if target_account is not null then
    update public.app_accounts set status = 'active' where id = target_account;
  end if;
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, created_by)
  values (actor_id, 'employee.restore', 'employees', employee_uuid, actor_id);
end;
$$;

revoke all on function public.crm_delete_employee(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.crm_restore_employee(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_delete_employee(uuid, uuid, uuid) to service_role;
grant execute on function public.crm_restore_employee(uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090300_employee_soft_delete.sql')
on conflict (name) do nothing;

commit;
