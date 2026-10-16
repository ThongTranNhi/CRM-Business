-- Kiểm tra bằng database thật: migration 20261017090000_my_task_status_filter.sql (Tổng quan cá nhân, Đợt 4 S2).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "my_task_status_filter: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  helper_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  owner_employee uuid; helper_employee uuid; board_a uuid; doing_column uuid; done_column uuid;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  week_start date := date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh'))::date;
  doing_task uuid; done_now_task uuid; done_last_week_task uuid; soon_task uuid; later_task uuid;
  counts jsonb;
begin
  insert into public.departments (id, name) values (department_a, '[TEST] phòng A ' || department_a);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-mts-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-mts-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}'),
    (helper_user, 'test-mts-2-' || helper_user || '@example.test', '{}', '{"full_name":"[TEST] 2"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = helper_user returning e.id into helper_employee;
  perform public.crm_create_dashboard(admin_user, department_a, null, null);
  select b.id into board_a from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_a;
  select id into doing_column from public.board_columns
  where board_id = board_a and status = 'in_progress' and is_default;
  select id into done_column from public.board_columns
  where board_id = board_a and status = 'done' and is_default;

  -- Cần làm: 1 quá hạn, 1 hạn sau 6 ngày (sắp đến hạn), 1 hạn sau 7 ngày (ngoài 7 ngày);
  -- việc phối hợp hạn hôm nay (sắp đến hạn, Cần làm); 1 đang làm; 1 xong tuần này; 1 xong trước tuần này.
  perform public.crm_create_task(admin_user, board_a, '[TEST] trễ', null, owner_employee,
    null, null, today - 1, '{}', null);
  soon_task := public.crm_create_task(admin_user, board_a, '[TEST] 6 ngày', null, owner_employee,
    null, null, today + 6, '{}', null);
  later_task := public.crm_create_task(admin_user, board_a, '[TEST] 7 ngày', null, owner_employee,
    null, null, today + 7, '{}', null);
  perform public.crm_create_task(admin_user, board_a, '[TEST] phối hợp', null, helper_employee,
    null, null, today, array[owner_employee], null);
  doing_task := public.crm_create_task(admin_user, board_a, '[TEST] đang làm', null, owner_employee,
    null, null, null, '{}', null);
  perform public.crm_move_task(admin_user, doing_task, doing_column, null, null);
  done_now_task := public.crm_create_task(admin_user, board_a, '[TEST] xong nay', null, owner_employee,
    null, null, null, '{}', null);
  perform public.crm_move_task(admin_user, done_now_task, done_column, null, null);
  done_last_week_task := public.crm_create_task(admin_user, board_a, '[TEST] xong tuần trước', null,
    owner_employee, null, null, null, '{}', null);
  perform public.crm_move_task(admin_user, done_last_week_task, done_column, null, null);
  -- 23:59 Chủ nhật tuần trước theo giờ Việt Nam: ngay trước mốc đầu tuần.
  update public.tasks set completed_at = ((week_start - 1) + time '23:59') at time zone 'Asia/Ho_Chi_Minh'
  where id = done_last_week_task;

  if not (select is_due_soon from public.my_task_rows
      where employee_id = owner_employee and id = soon_task)
    or (select is_due_soon from public.my_task_rows
      where employee_id = owner_employee and id = later_task) then
    raise exception 'is_due_soon phải gồm hôm nay → 6 ngày sau, không gồm ngày thứ 7';
  end if;
  if (select count(*) from public.my_task_rows
      where employee_id = owner_employee and is_due_soon) <> 2 then
    raise exception 'Sắp đến hạn gồm việc phụ trách và phối hợp, bỏ việc quá hạn';
  end if;
  if not (select is_done_this_week from public.my_task_rows
      where employee_id = owner_employee and id = done_now_task)
    or (select is_done_this_week from public.my_task_rows
      where employee_id = owner_employee and id = done_last_week_task) then
    raise exception 'is_done_this_week phải tính từ 00:00 Thứ Hai giờ Việt Nam';
  end if;

  counts := public.crm_my_task_counts(owner_employee);
  if (counts ->> 'todo')::int <> 4 or (counts ->> 'in_progress')::int <> 1
    or (counts ->> 'overdue')::int <> 1 or (counts ->> 'done_this_week')::int <> 1
    or (counts ->> 'open')::int <> 5 or (counts ->> 'done')::int <> 2 then
    raise exception 'Số đếm sai: %', counts;
  end if;

  -- Lọc trạng thái áp vào mọi số đếm, như các bộ lọc cũ.
  counts := public.crm_my_task_counts(owner_employee, task_status => 'in_progress');
  if (counts ->> 'open')::int <> 1 or (counts ->> 'todo')::int <> 0 or (counts ->> 'done')::int <> 0 then
    raise exception 'Lọc trạng thái phải áp vào mọi số đếm: %', counts;
  end if;
  counts := public.crm_my_task_counts(owner_employee, done_this_week => true);
  if (counts ->> 'done')::int <> 1 or (counts ->> 'open')::int <> 0 then
    raise exception 'Lọc xong tuần này sai: %', counts;
  end if;

  -- Gọi kiểu cũ (5 tham số theo tên, như API trước bản này) vẫn chạy.
  counts := public.crm_my_task_counts(employee_uuid => owner_employee, department_uuid => null,
    task_priority => null, project_uuid => null, search => 'trễ');
  if (counts ->> 'open')::int <> 1 then
    raise exception 'Gọi bằng 5 tham số cũ phải vẫn chạy: %', counts;
  end if;

  raise notice 'my_task_status_filter: đạt';
end;
$$;

rollback;
