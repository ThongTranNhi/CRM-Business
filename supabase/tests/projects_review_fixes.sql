-- Kiểm tra bằng database thật: migration 20261010090000_projects_review_fixes.sql.
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "projects_review_fixes: đạt". Sai: dừng bằng exception.
-- FOR SHARE ở crm_assert_task_project cần hai phiên song song — xem ghi chú cuối file.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  first_user uuid := gen_random_uuid();
  second_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  first_employee uuid; second_employee uuid; project_a uuid; audit record;
begin
  insert into public.departments (id, name) values (department_a, '[TEST] phòng A ' || department_a);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-prf-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (first_user, 'test-prf-1-' || first_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}'),
    (second_user, 'test-prf-2-' || second_user || '@example.test', '{}', '{"full_name":"[TEST] 2"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = first_user returning e.id into first_employee;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = second_user returning e.id into second_employee;

  project_a := public.crm_create_project(admin_user, department_a, '[TEST] Đổi chủ', null,
    first_employee, 'active', null, null, '{}');

  -- Đổi chủ: chủ mới tự vào thành viên VÀ có audit project.members (cũ → mới).
  perform public.crm_update_project(admin_user, project_a,
    jsonb_build_object('ownerEmployeeId', second_employee));
  if not exists (select 1 from public.project_members
    where project_id = project_a and employee_id = second_employee) then
    raise exception 'Chủ mới phải được thêm vào thành viên';
  end if;
  select old_values, new_values into audit from public.audit_logs
  where resource_type = 'projects' and resource_id = project_a and action = 'project.members'
  order by created_at desc limit 1;
  if audit is null
    or not (audit.new_values -> 'employeeIds') @> to_jsonb(array[first_employee, second_employee])
    or (audit.old_values -> 'employeeIds') @> to_jsonb(array[second_employee]) then
    raise exception 'Đổi chủ phải ghi audit project.members: %', audit;
  end if;

  -- Đổi lại chủ cũ (đã là thành viên) → không ghi thêm audit project.members.
  perform public.crm_update_project(admin_user, project_a,
    jsonb_build_object('ownerEmployeeId', first_employee));
  if (select count(*) from public.audit_logs where resource_type = 'projects'
      and resource_id = project_a and action = 'project.members') <> 2 then
    raise exception 'Chủ đã là thành viên thì không ghi thêm audit thành viên';
  end if;

  raise notice 'projects_review_fixes: đạt';
end;
$$;

rollback;

-- FOR SHARE (thử tay, hai tab SQL Editor):
--   Tab 1: begin; select app_private.crm_assert_task_project('<phòng>', '<dự án>');  -- giữ giao dịch
--   Tab 2: select public.crm_archive_project('<auth user super admin>', '<dự án>');   -- phải CHỜ
--   Tab 1: rollback;  → Tab 2 chạy tiếp.
