-- Kiểm tra bằng database thật: migration 20261023090000_executive_overview.sql (Tổng quan điều hành).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "executive_overview: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  department_b uuid := gen_random_uuid();
  owner_employee uuid; dashboard_a uuid; board_a uuid; board_b uuid; doing_column uuid; done_column uuid;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  quarter_start date := date_trunc('quarter', (now() at time zone 'Asia/Ho_Chi_Minh')::date)::date;
  doing_task uuid; done_task uuid; old_task uuid; gone_task uuid; soon_task uuid;
  stats record; upcoming record;
begin
  insert into public.departments (id, name) values
    (department_a, '[TEST] phòng A ' || department_a), (department_b, '[TEST] phòng B ' || department_b);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-exec-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-exec-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;

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

  -- Phòng A tạo trong kỳ: 1 quá hạn (cần làm), 1 hạn 6 ngày nữa, 1 đang làm, 1 xong (hạn đã qua — không tính quá
  -- hạn). Ngoài kỳ: 1 tạo trước đầu quý. Không tính: 1 đã lưu trữ. Phòng B: 1 cần làm.
  perform public.crm_create_task(admin_user, board_a, '[TEST] trễ', null, owner_employee,
    null, null, today - 1, '{}', null);
  soon_task := public.crm_create_task(admin_user, board_a, '[TEST] 6 ngày', null, owner_employee,
    null, null, today + 6, '{}', null);
  doing_task := public.crm_create_task(admin_user, board_a, '[TEST] đang làm', null, owner_employee,
    null, null, today + 7, '{}', null);
  perform public.crm_move_task(admin_user, doing_task, doing_column, null, null);
  done_task := public.crm_create_task(admin_user, board_a, '[TEST] xong', null, owner_employee,
    null, null, today - 3, '{}', null);
  perform public.crm_move_task(admin_user, done_task, done_column, null, null);
  old_task := public.crm_create_task(admin_user, board_a, '[TEST] cũ', null, owner_employee,
    null, null, null, '{}', null);
  update public.tasks set created_at = (quarter_start - 1)::timestamp at time zone 'Asia/Ho_Chi_Minh'
  where id = old_task;
  gone_task := public.crm_create_task(admin_user, board_a, '[TEST] lưu trữ', null, owner_employee,
    null, null, today, '{}', null);
  update public.tasks set archived_at = now() where id = gone_task;
  perform public.crm_create_task(admin_user, board_b, '[TEST] phòng B', null, owner_employee,
    null, null, null, '{}', null);

  select * into stats from public.crm_executive_task_stats('quarter', department_a);
  if stats.department_id <> department_a or stats.dashboard_id <> dashboard_a or stats.todo_count <> 2
    or stats.in_progress_count <> 1 or stats.done_count <> 1 or stats.overdue_count <> 1 then
    raise exception 'Số đếm phòng A sai: %', row_to_json(stats);
  end if;
  if (select count(*) from public.crm_executive_task_stats('quarter', department_a)) <> 1 then
    raise exception 'Lọc phòng phải chỉ trả phòng A';
  end if;
  if not exists (select 1 from public.crm_executive_task_stats('week', null)
      where department_id = department_b and todo_count = 1) then
    raise exception 'Mọi phòng phải có phòng B';
  end if;
  -- Việc tạo hôm nay luôn nằm trong tuần / tháng này; việc cũ (trước đầu quý) không vào kỳ nào.
  if (select todo_count from public.crm_executive_task_stats('week', department_a)) <> 2 then
    raise exception 'Kỳ tuần sai';
  end if;
  begin
    perform public.crm_executive_task_stats('year', null);
    raise exception 'Kỳ sai phải bị chặn';
  exception when raise_exception then
    if sqlerrm <> 'INVALID_PERIOD' then raise; end if;
  end;

  select * into upcoming from public.upcoming_task_rows where id = soon_task;
  if upcoming.days_left <> 6 or upcoming.dashboard_id <> dashboard_a
    or upcoming.assignee_id <> owner_employee then
    raise exception 'upcoming_task_rows sai: %', row_to_json(upcoming);
  end if;
  if exists (select 1 from public.upcoming_task_rows where id in (done_task, gone_task, old_task)) then
    raise exception 'upcoming_task_rows không được có việc xong / lưu trữ / không hạn';
  end if;

  if has_function_privilege('authenticated', 'public.crm_executive_task_stats(text, uuid)', 'execute')
    or has_table_privilege('authenticated', 'public.upcoming_task_rows', 'select') then
    raise exception 'authenticated không được đọc dữ liệu tổng quan điều hành';
  end if;

  raise notice 'executive_overview: đạt';
end;
$$;

rollback;
