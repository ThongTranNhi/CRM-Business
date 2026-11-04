-- Kiểm tra bằng database thật: migration 20261105090000_employees_own_name_change.sql (tự đổi họ tên ở Hồ sơ).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "employees_own_name_change: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  staff_user uuid := gen_random_uuid();
  admin_user uuid := gen_random_uuid();
  staff_employee uuid; staff_account uuid; current_name text;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (staff_user, 'test-name-' || staff_user || '@example.test', '{}', '{"full_name":"[TEST] tên cũ"}'),
    (admin_user, 'test-name-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] CEO"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  select e.id, a.id into staff_employee, staff_account from public.employees e
  join public.app_accounts a on a.id = e.account_id where a.auth_user_id = staff_user;

  -- Super Admin (CEO / Master) cũng tự đổi được tên của chính mình.
  perform public.update_own_profile(admin_user, null, null, false, '[TEST] CEO mới');
  if not exists (select 1 from public.employees e join public.app_accounts a on a.id = e.account_id
      where a.auth_user_id = admin_user and e.full_name = '[TEST] CEO mới') then
    raise exception 'Super Admin chưa tự đổi được tên';
  end if;

  -- Đổi tên (có khoảng trắng thừa) → lưu đã trim, ghi audit với người đổi là chính mình.
  perform public.update_own_profile(staff_user, null, null, false, '  [TEST] Tên mới  ');
  select full_name into current_name from public.employees where id = staff_employee;
  if current_name <> '[TEST] Tên mới' then raise exception 'Đổi tên sai: %', current_name; end if;
  if not exists (select 1 from public.audit_logs where resource_id = staff_employee
      and actor_account_id = staff_account and new_values ->> 'full_name' = '[TEST] Tên mới') then
    raise exception 'Đổi tên chưa ghi audit';
  end if;

  -- Không gửi tên (cách gọi cũ 4 tham số) → giữ nguyên tên.
  perform public.update_own_profile(staff_user, 'TEST-01', null, false);
  select full_name into current_name from public.employees where id = staff_employee;
  if current_name <> '[TEST] Tên mới' then raise exception 'Gọi không có tên làm đổi tên: %', current_name; end if;

  -- Tên rỗng hoặc quá 120 ký tự bị chặn.
  begin
    perform public.update_own_profile(staff_user, null, null, false, '   ');
    raise exception 'Tên rỗng phải bị chặn';
  exception when others then
    if sqlerrm <> 'INVALID_FULL_NAME' then raise; end if;
  end;
  begin
    perform public.update_own_profile(staff_user, null, null, false, repeat('a', 121));
    raise exception 'Tên quá dài phải bị chặn';
  exception when others then
    if sqlerrm <> 'INVALID_FULL_NAME' then raise; end if;
  end;

  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'update_own_profile') <> 1 then
    raise exception 'Còn nhiều hơn một update_own_profile';
  end if;
  if has_function_privilege('authenticated',
      'public.update_own_profile(uuid, text, text, boolean, text)', 'execute') then
    raise exception 'authenticated không được gọi update_own_profile';
  end if;

  raise notice 'employees_own_name_change: đạt';
end;
$$;

rollback;
