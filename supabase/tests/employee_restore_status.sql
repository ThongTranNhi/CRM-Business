-- Kiểm tra bằng database thật: khôi phục nhân viên trả tài khoản về trạng thái trước khi xoá (BR-53).
-- Chạy trong SQL Editor ở môi trường dev, sau migration 20261006090400. Kết thúc bằng ROLLBACK nên không
-- để lại dữ liệu. Thành công: hiện thông báo "employee_restore_status: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  blocked_user uuid := gen_random_uuid();
  active_user uuid := gen_random_uuid();
  legacy_user uuid := gen_random_uuid();
  blocked_employee uuid;
  active_employee uuid;
  legacy_employee uuid;
  account_status text;
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090400_employee_restore_previous_status.sql') then
    raise exception 'Chạy 20261006090400_employee_restore_previous_status.sql trước';
  end if;

  -- Trigger đăng ký tạo sẵn app_accounts + employees cho mỗi auth user.
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-admin-' || admin_user || '@example.test', '{}', '{"full_name":"TEST admin"}'),
    (blocked_user, 'test-blocked-' || blocked_user || '@example.test', '{}', '{"full_name":"TEST khoá"}'),
    (active_user, 'test-active-' || active_user || '@example.test', '{}', '{"full_name":"TEST mở"}'),
    (legacy_user, 'test-legacy-' || legacy_user || '@example.test', '{}', '{"full_name":"TEST cũ"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.app_accounts
  set status = 'blocked', blocked_at = now(), blocked_reason = 'TEST khoá trước khi xoá'
  where auth_user_id = blocked_user;

  select e.id into blocked_employee from public.employees e
  join public.app_accounts a on a.id = e.account_id where a.auth_user_id = blocked_user;
  select e.id into active_employee from public.employees e
  join public.app_accounts a on a.id = e.account_id where a.auth_user_id = active_user;
  select e.id into legacy_employee from public.employees e
  join public.app_accounts a on a.id = e.account_id where a.auth_user_id = legacy_user;

  -- 1. Tài khoản đã khoá trước khi xoá → khôi phục xong vẫn khoá.
  perform public.crm_delete_employee(admin_user, blocked_employee, null);
  select status into account_status from public.app_accounts where auth_user_id = blocked_user;
  if account_status <> 'disabled' then
    raise exception 'Xoá nhân viên phải đặt tài khoản disabled, đang là %', account_status;
  end if;
  if not exists (select 1 from public.audit_logs
    where resource_id = blocked_employee and action = 'employee.delete'
      and new_values ->> 'previousAccountStatus' = 'blocked') then
    raise exception 'Audit employee.delete phải lưu previousAccountStatus = blocked';
  end if;
  perform public.crm_restore_employee(admin_user, blocked_employee);
  select status into account_status from public.app_accounts where auth_user_id = blocked_user;
  if account_status <> 'blocked' then
    raise exception 'Tài khoản khoá trước khi xoá phải khôi phục về blocked, đang là %', account_status;
  end if;

  -- 2. Tài khoản đang mở → khôi phục về active.
  perform public.crm_delete_employee(admin_user, active_employee, null);
  perform public.crm_restore_employee(admin_user, active_employee);
  select status into account_status from public.app_accounts where auth_user_id = active_user;
  if account_status <> 'active' then
    raise exception 'Tài khoản đang mở phải khôi phục về active, đang là %', account_status;
  end if;

  -- 3. Xoá trước migration (audit không có previousAccountStatus) → active.
  update public.employees set archived_at = now() where id = legacy_employee;
  update public.app_accounts set status = 'disabled' where auth_user_id = legacy_user;
  insert into public.audit_logs (action, resource_type, resource_id, new_values)
  values ('employee.delete', 'employees', legacy_employee, '{"managedDepartmentId":null}');
  perform public.crm_restore_employee(admin_user, legacy_employee);
  select status into account_status from public.app_accounts where auth_user_id = legacy_user;
  if account_status <> 'active' then
    raise exception 'Xoá trước migration phải khôi phục về active, đang là %', account_status;
  end if;

  raise notice 'employee_restore_status: đạt';
end;
$$;

rollback;
