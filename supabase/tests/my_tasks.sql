-- Kiểm tra bằng database thật: migration 20261011090000_my_tasks.sql (Việc của tôi, Đợt 3 S2).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "my_tasks: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  helper_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  department_b uuid := gen_random_uuid();
  owner_employee uuid; helper_employee uuid; board_a uuid; done_column uuid;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  late_task uuid; today_task uuid; shared_task uuid; done_task uuid; gone_task uuid; counts jsonb;
begin
  insert into public.departments (id, name) values
    (department_a, '[TEST] phòng A ' || department_a), (department_b, '[TEST] phòng B ' || department_b);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-mine-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-mine-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}'),
    (helper_user, 'test-mine-2-' || helper_user || '@example.test', '{}', '{"full_name":"[TEST] 2"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = helper_user returning e.id into helper_employee;
  perform public.crm_create_dashboard(admin_user, department_a, null, null);
  select b.id into board_a from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_a;
  select id into done_column from public.board_columns
  where board_id = board_a and status = 'done' and is_default;

  late_task := public.crm_create_task(admin_user, board_a, '[TEST] trễ', null, owner_employee,
    null, null, today - 1, '{}', null);
  today_task := public.crm_create_task(admin_user, board_a, '[TEST] hôm nay', null, owner_employee,
    null, null, today, '{}', null);
  shared_task := public.crm_create_task(admin_user, board_a, '[TEST] phối hợp', null, helper_employee,
    null, null, null, array[owner_employee], null);
  done_task := public.crm_create_task(admin_user, board_a, '[TEST] xong', null, owner_employee,
    null, null, today - 3, '{}', null);
  perform public.crm_move_task(admin_user, done_task, done_column, null, null);
  gone_task := public.crm_create_task(admin_user, board_a, '[TEST] đã xoá', null, owner_employee,
    null, null, today, '{}', null);
  perform public.crm_archive_task(admin_user, gone_task);

  -- Việc phối hợp có nhãn; việc đã xong không quá hạn; task lưu trữ không có.
  if not exists (select 1 from public.my_task_rows
    where employee_id = owner_employee and id = shared_task and not is_assignee) then
    raise exception 'Việc phối hợp phải có trong danh sách (is_assignee = false)';
  end if;
  if exists (select 1 from public.my_task_rows where employee_id = owner_employee and id = gone_task) then
    raise exception 'Task đã lưu trữ không được hiện';
  end if;
  if (select done_column_id from public.my_task_rows
      where employee_id = owner_employee and id = late_task) <> done_column then
    raise exception 'done_column_id phải là cột mặc định nhóm done';
  end if;

  counts := public.crm_my_task_counts(owner_employee);
  if counts <> jsonb_build_object('today', 1, 'week',
      (select count(*) from unnest(array[today - 1, today]) d
       where d >= date_trunc('week', today)::date), 'overdue', 1, 'open', 3, 'done', 1) then
    raise exception 'Số đếm sai: %', counts;
  end if;
  if (public.crm_my_task_counts(owner_employee, null, null, null, 'phối') ->> 'open')::int <> 1 then
    raise exception 'Tìm theo tên phải áp vào số đếm';
  end if;
  if (public.crm_my_task_counts(owner_employee, null, null, null, '\_') ->> 'open')::int <> 0 then
    raise exception '\_ phải tìm đúng ký tự gạch dưới, không phải ký tự đại diện';
  end if;

  -- Chuyển sang phòng khác (không được mời vào board) → không còn thấy việc của board cũ.
  update public.employees set department_id = department_b where id = owner_employee;
  if exists (select 1 from public.my_task_rows where employee_id = owner_employee) then
    raise exception 'Người đã chuyển phòng không còn xem được board cũ';
  end if;
  -- Được mời lại vào board → thấy lại.
  insert into public.board_members (board_id, employee_id, created_by)
  select board_a, owner_employee, a.id from public.app_accounts a where a.auth_user_id = admin_user;
  if not exists (select 1 from public.my_task_rows
    where employee_id = owner_employee and id = late_task and is_board_member) then
    raise exception 'Thành viên board (phòng khác) vẫn thấy việc của mình';
  end if;

  -- Phòng ban đã xoá → bỏ khỏi Việc của tôi.
  update public.departments set archived_at = now() where id = department_a;
  if exists (select 1 from public.my_task_rows where employee_id = owner_employee) then
    raise exception 'Phòng ban đã xoá phải bị bỏ khỏi Việc của tôi';
  end if;

  raise notice 'my_tasks: đạt';
end;
$$;

rollback;
