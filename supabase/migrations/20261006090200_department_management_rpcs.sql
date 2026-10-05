-- RPC quản lý phòng ban: tạo, sửa, đổi trưởng phòng, chuyển nhân viên, xoá mềm, khôi phục.
-- Mọi thao tác ghi đi qua đây để audit ghi đúng người thao tác (BR-08, BR-09, BR-22).
-- Lỗi nghiệp vụ raise bằng mã UPPER_SNAKE_CASE; API đổi mã thành AppError.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090100_departments_optional_manager.sql') then
    raise exception 'Chạy 20261006090100_departments_optional_manager.sql trước';
  end if;
end;
$$;

-- Kiểm tra người gọi (lấy từ JWT đã xác minh ở API) và gắn họ vào audit của giao dịch.
create or replace function app_private.crm_actor(actor_uuid uuid, allowed_roles text[])
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid;
begin
  select id into actor_id from public.app_accounts
  where auth_user_id = actor_uuid and status = 'active' and not must_change_password
    and role = any (allowed_roles);
  if actor_id is null then raise exception 'FORBIDDEN'; end if;
  perform set_config('app.actor_account_id', actor_id::text, true);
  return actor_id;
end;
$$;

create or replace function app_private.crm_lock_active_department(department_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.departments
  where id = department_uuid and archived_at is null for update;
  if not found then raise exception 'DEPARTMENT_NOT_FOUND'; end if;
end;
$$;

create or replace function app_private.crm_assert_department_name_free(
  department_name text, except_uuid uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.departments
    where lower(name) = lower(btrim(department_name)) and archived_at is null
      and id is distinct from except_uuid) then
    raise exception 'DEPARTMENT_NAME_EXISTS';
  end if;
end;
$$;

-- Trưởng phòng phải thuộc phòng: người ở phòng khác được chuyển sang,
-- người đang là trưởng một phòng khác thì từ chối.
create or replace function app_private.crm_assign_manager(department_uuid uuid, employee_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from public.employees
  where id = employee_uuid and archived_at is null for update;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if exists (select 1 from public.departments
    where manager_employee_id = employee_uuid and id <> department_uuid and archived_at is null) then
    raise exception 'EMPLOYEE_IS_MANAGER';
  end if;
  update public.employees set department_id = department_uuid
  where id = employee_uuid and department_id is distinct from department_uuid;
  update public.departments set manager_employee_id = employee_uuid
  where id = department_uuid and manager_employee_id is distinct from employee_uuid;
end;
$$;

revoke all on function app_private.crm_actor(uuid, text[]) from public, anon, authenticated, service_role;
revoke all on function app_private.crm_lock_active_department(uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.crm_assert_department_name_free(text, uuid) from public, anon, authenticated, service_role;
revoke all on function app_private.crm_assign_manager(uuid, uuid) from public, anon, authenticated, service_role;

create or replace function public.crm_create_department(
  actor_uuid uuid, department_name text, manager_uuid uuid
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; new_id uuid;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin', 'hr_admin']);
  perform app_private.crm_assert_department_name_free(department_name, null);
  insert into public.departments (name, created_by)
  values (btrim(department_name), actor_id) returning id into new_id;
  if manager_uuid is not null then
    perform app_private.crm_assign_manager(new_id, manager_uuid);
  end if;
  return new_id;
end;
$$;

-- department_name null: giữ tên. change_manager false: giữ trưởng phòng; true + null: bỏ trưởng phòng.
create or replace function public.crm_update_department(
  actor_uuid uuid, department_uuid uuid, department_name text,
  manager_uuid uuid, change_manager boolean
) returns void language plpgsql security definer set search_path = '' as $$
begin
  perform app_private.crm_actor(actor_uuid, array['super_admin', 'hr_admin']);
  perform app_private.crm_lock_active_department(department_uuid);
  if department_name is not null then
    perform app_private.crm_assert_department_name_free(department_name, department_uuid);
    update public.departments set name = btrim(department_name)
    where id = department_uuid and name <> btrim(department_name);
  end if;
  if not change_manager then return; end if;
  if manager_uuid is null then
    update public.departments set manager_employee_id = null
    where id = department_uuid and manager_employee_id is not null;
  else
    perform app_private.crm_assign_manager(department_uuid, manager_uuid);
  end if;
end;
$$;

-- Dùng cho [Thêm thành viên] và [Chuyển phòng]. Chuyển trưởng phòng đi thì phòng cũ
-- thành "Chưa có trưởng phòng", hoặc nhận replacement_manager_uuid nếu có chọn.
create or replace function public.crm_move_employee(
  actor_uuid uuid, employee_uuid uuid, department_uuid uuid, replacement_manager_uuid uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare old_department uuid; was_manager boolean;
begin
  perform app_private.crm_actor(actor_uuid, array['super_admin', 'hr_admin']);
  perform app_private.crm_lock_active_department(department_uuid);
  select department_id into old_department from public.employees
  where id = employee_uuid and archived_at is null for update;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if old_department is not distinct from department_uuid then return; end if;
  if replacement_manager_uuid = employee_uuid then
    raise exception 'INVALID_REPLACEMENT_MANAGER';
  end if;
  update public.departments set manager_employee_id = null
  where id = old_department and manager_employee_id = employee_uuid;
  was_manager := found;
  update public.employees set department_id = department_uuid where id = employee_uuid;
  if was_manager and replacement_manager_uuid is not null then
    perform app_private.crm_assign_manager(old_department, replacement_manager_uuid);
  end if;
end;
$$;

-- BR-09: chỉ Super Admin; còn nhân viên thì bắt buộc có phòng nhận, chuyển hết trong cùng giao dịch.
create or replace function public.crm_delete_department(
  actor_uuid uuid, department_uuid uuid, receiving_uuid uuid
) returns integer language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; moved integer;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin']);
  perform app_private.crm_lock_active_department(department_uuid);
  select count(*) into moved from public.employees
  where department_id = department_uuid and archived_at is null;
  if moved > 0 then
    if receiving_uuid is null then raise exception 'RECEIVING_DEPARTMENT_REQUIRED'; end if;
    perform 1 from public.departments
    where id = receiving_uuid and id <> department_uuid and archived_at is null for update;
    if not found then raise exception 'RECEIVING_DEPARTMENT_INVALID'; end if;
  end if;
  update public.departments set manager_employee_id = null, archived_at = now()
  where id = department_uuid;
  update public.employees set department_id = receiving_uuid
  where department_id = department_uuid and archived_at is null;
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
  values (actor_id, 'department.delete', 'departments', department_uuid,
    jsonb_build_object('receivingDepartmentId', receiving_uuid, 'movedEmployees', moved), actor_id);
  return moved;
end;
$$;

-- Khôi phục không kèm trưởng phòng và nhân viên; tên đã bị phòng khác dùng thì từ chối.
create or replace function public.crm_restore_department(actor_uuid uuid, department_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; archived_name text;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin']);
  select name into archived_name from public.departments
  where id = department_uuid and archived_at is not null for update;
  if not found then raise exception 'DEPARTMENT_NOT_FOUND'; end if;
  perform app_private.crm_assert_department_name_free(archived_name, department_uuid);
  update public.departments set archived_at = null where id = department_uuid;
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, created_by)
  values (actor_id, 'department.restore', 'departments', department_uuid, actor_id);
end;
$$;

-- Thay bản cũ: đổi phòng của trưởng phòng thì phòng cũ thành "Chưa có trưởng phòng";
-- phòng mới phải còn hoạt động.
create or replace function public.crm_admin_update_employee(actor_uuid uuid, employee_uuid uuid,
  employee_name text, employee_job_title text, employee_department_id uuid, account_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare target_account uuid; target_role text; old_department uuid;
begin
  perform app_private.crm_actor(actor_uuid, array['super_admin']);
  select e.account_id, a.role, e.department_id into target_account, target_role, old_department
  from public.employees e left join public.app_accounts a on a.id = e.account_id
  where e.id = employee_uuid and e.archived_at is null for update of e;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if target_role = 'super_admin' then raise exception 'Cannot modify administrator via employee form'; end if;
  if account_status not in ('active', 'disabled') then raise exception 'Invalid status'; end if;
  if nullif(btrim(employee_name), '') is null or length(employee_name) > 120 then
    raise exception 'Invalid name'; end if;
  if employee_department_id is distinct from old_department then
    if employee_department_id is not null then
      perform app_private.crm_lock_active_department(employee_department_id);
    end if;
    update public.departments set manager_employee_id = null
    where id = old_department and manager_employee_id = employee_uuid;
  end if;
  update public.employees set full_name = btrim(employee_name),
    job_title = nullif(btrim(employee_job_title), ''), department_id = employee_department_id
  where id = employee_uuid;
  if target_account is not null then
    update public.app_accounts set status = account_status where id = target_account;
    if account_status = 'disabled' then
      delete from auth.sessions
      where user_id = (select auth_user_id from public.app_accounts where id = target_account);
    end if;
  end if;
end;
$$;

revoke all on function public.crm_create_department(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.crm_update_department(uuid, uuid, text, uuid, boolean) from public, anon, authenticated;
revoke all on function public.crm_move_employee(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.crm_delete_department(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.crm_restore_department(uuid, uuid) from public, anon, authenticated;
revoke all on function public.crm_admin_update_employee(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.crm_create_department(uuid, text, uuid) to service_role;
grant execute on function public.crm_update_department(uuid, uuid, text, uuid, boolean) to service_role;
grant execute on function public.crm_move_employee(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.crm_delete_department(uuid, uuid, uuid) to service_role;
grant execute on function public.crm_restore_department(uuid, uuid) to service_role;
grant execute on function public.crm_admin_update_employee(uuid, uuid, text, text, uuid, text) to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090200_department_management_rpcs.sql')
on conflict (name) do nothing;

commit;
