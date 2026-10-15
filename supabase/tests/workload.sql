-- Kiểm tra bằng database thật: migration 20261016090000_workload.sql (Khối lượng việc, Đợt 4 S1).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "workload: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  helper_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  department_b uuid := gen_random_uuid();
  owner_employee uuid; helper_employee uuid; admin_account uuid;
  dashboard_a uuid; board_a uuid; board_b uuid; doing_column uuid; done_column uuid;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  doing_task uuid; done_task uuid; old_done_task uuid; gone_task uuid;
  load public.employee_workload;
begin
  insert into public.departments (id, name) values
    (department_a, '[TEST] phòng A ' || department_a), (department_b, '[TEST] phòng B ' || department_b);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-load-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-load-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}'),
    (helper_user, 'test-load-2-' || helper_user || '@example.test', '{}', '{"full_name":"[TEST] 2"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user
  returning id into admin_account;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = helper_user returning e.id into helper_employee;

  perform public.crm_create_dashboard(admin_user, department_a, null, null);
  perform public.crm_create_dashboard(admin_user, department_b, null, null);
  select d.id, b.id into dashboard_a, board_a from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_a;
  select b.id into board_b from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_b;
  select id into doing_column from public.board_columns
  where board_id = board_a and status = 'in_progress' and is_default;
  select id into done_column from public.board_columns
  where board_id = board_a and status = 'done' and is_default;

  -- Phòng A: 1 quá hạn (cần làm), 1 cần làm chưa tới hạn, 1 đang làm, 1 xong hôm nay, 1 xong 40 ngày trước,
  -- 1 đã lưu trữ; 1 việc chỉ phối hợp (không tính).
  perform public.crm_create_task(admin_user, board_a, '[TEST] trễ', null, owner_employee,
    null, null, today - 1, '{}', null);
  perform public.crm_create_task(admin_user, board_a, '[TEST] mai', null, owner_employee,
    null, null, today + 1, '{}', null);
  doing_task := public.crm_create_task(admin_user, board_a, '[TEST] đang làm', null, owner_employee,
    null, null, null, '{}', null);
  perform public.crm_move_task(admin_user, doing_task, doing_column, null, null);
  done_task := public.crm_create_task(admin_user, board_a, '[TEST] xong', null, owner_employee,
    null, null, today - 5, '{}', null);
  perform public.crm_move_task(admin_user, done_task, done_column, null, null);
  old_done_task := public.crm_create_task(admin_user, board_a, '[TEST] xong lâu', null, owner_employee,
    null, null, null, '{}', null);
  perform public.crm_move_task(admin_user, old_done_task, done_column, null, null);
  update public.tasks set completed_at = now() - interval '40 days' where id = old_done_task;
  gone_task := public.crm_create_task(admin_user, board_a, '[TEST] đã xoá', null, owner_employee,
    null, null, today - 1, '{}', null);
  perform public.crm_archive_task(admin_user, gone_task);
  perform public.crm_create_task(admin_user, board_a, '[TEST] phối hợp', null, helper_employee,
    null, null, today - 1, array[owner_employee], null);

  -- Phòng B (được mời vào board): vẫn tính vào khối lượng của người đó.
  insert into public.board_members (board_id, employee_id, created_by)
  values (board_b, owner_employee, admin_account);
  perform public.crm_create_task(admin_user, board_b, '[TEST] phòng B', null, owner_employee,
    null, null, null, '{}', null);

  select * into load from public.employee_workload where employee_id = owner_employee;
  if load.todo_count <> 3 or load.in_progress_count <> 1 or load.open_count <> 4
    or load.overdue_count <> 1 or load.done_30d_count <> 1 then
    raise exception 'Số đếm sai: todo %, in_progress %, open %, overdue %, done_30d %',
      load.todo_count, load.in_progress_count, load.open_count, load.overdue_count, load.done_30d_count;
  end if;
  if load.dashboard_id is distinct from dashboard_a or load.department_id <> department_a then
    raise exception 'dashboard_id / department_id phải là của phòng nhân viên';
  end if;
  if (select open_count from public.employee_workload where employee_id = helper_employee) <> 1 then
    raise exception 'Việc phối hợp chỉ tính cho người phụ trách chính';
  end if;

  -- Phòng B bị xoá → việc trên board B không còn tính.
  update public.departments set archived_at = now() where id = department_b;
  if (select open_count from public.employee_workload where employee_id = owner_employee) <> 3 then
    raise exception 'Việc của phòng đã xoá không được tính';
  end if;

  -- Nhân viên đã xoá không có trong bảng.
  update public.employees set archived_at = now() where id = helper_employee;
  if exists (select 1 from public.employee_workload where employee_id = helper_employee) then
    raise exception 'Nhân viên đã xoá không được hiện';
  end if;

  raise notice 'workload: đạt';
end;
$$;

rollback;
