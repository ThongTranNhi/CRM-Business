-- Khôi phục nhân viên (BR-53) trả tài khoản về đúng trạng thái trước khi xoá, thay vì luôn 'active':
-- tài khoản đã khoá trước khi xoá thì khôi phục xong vẫn khoá.
-- crm_delete_employee lưu trạng thái cũ vào audit employee.delete (new_values.previousAccountStatus);
-- crm_restore_employee đọc audit employee.delete gần nhất, không có (xoá trước migration này) thì 'active'.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090300_employee_soft_delete.sql') then
    raise exception 'Chạy 20261006090300_employee_soft_delete.sql trước';
  end if;
end;
$$;

create or replace function public.crm_delete_employee(
  actor_uuid uuid, employee_uuid uuid, new_manager_uuid uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid; target_account uuid; target_role text; target_user uuid; target_status text;
  managed_department uuid;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin']);
  select e.account_id, a.role, a.auth_user_id, a.status
  into target_account, target_role, target_user, target_status
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
    jsonb_build_object('managedDepartmentId', managed_department, 'newManagerId', new_manager_uuid,
      'previousAccountStatus', target_status),
    actor_id);
end;
$$;

-- Không gán lại chức trưởng phòng; phòng cũ đã xoá thì để "Chưa gán".
create or replace function public.crm_restore_employee(actor_uuid uuid, employee_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid; target_account uuid; target_code text; target_department uuid; restored_status text;
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
    select l.new_values ->> 'previousAccountStatus' into restored_status
    from public.audit_logs l
    where l.resource_type = 'employees' and l.resource_id = employee_uuid
      and l.action = 'employee.delete'
    order by l.created_at desc
    limit 1;
    if restored_status is null or restored_status not in ('active', 'blocked', 'disabled') then
      restored_status := 'active';
    end if;
    update public.app_accounts set status = restored_status where id = target_account;
  end if;
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
  values (actor_id, 'employee.restore', 'employees', employee_uuid,
    jsonb_build_object('restoredAccountStatus', restored_status), actor_id);
end;
$$;

revoke all on function public.crm_delete_employee(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.crm_restore_employee(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_delete_employee(uuid, uuid, uuid) to service_role;
grant execute on function public.crm_restore_employee(uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090400_employee_restore_previous_status.sql')
on conflict (name) do nothing;

commit;
