-- Kiểm tra bằng database thật thông báo (Đợt 3 S3 — migration 20261013090000): giao việc, thêm người phối hợp,
-- @mention, sắp đến hạn không trùng khi chạy lại, không tự báo cho chính mình, đánh dấu đã đọc.
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK.
-- Thành công: "notifications: đạt". Sai: dừng bằng exception.
begin;

create function pg_temp.test_employee(user_uuid uuid, label text, department_uuid uuid) returns uuid
language plpgsql as $$
declare employee_uuid uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  values (user_uuid, 'test-nt-' || user_uuid || '@example.test', '{}',
    jsonb_build_object('full_name', '[TEST] ' || label));
  update public.employees e set department_id = department_uuid from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = user_uuid
  returning e.id into employee_uuid;
  return employee_uuid;
end;
$$;

create function pg_temp.count_of(user_uuid uuid, notification_type text) returns integer
language sql as $$
  select count(*)::int from public.notification_feed
  where recipient_user_id = user_uuid and type = notification_type;
$$;

do $$
declare
  admin_user uuid := gen_random_uuid();
  user_a uuid := gen_random_uuid();
  user_b uuid := gen_random_uuid();
  user_out uuid := gen_random_uuid();
  department_uuid uuid := gen_random_uuid();
  other_department uuid := gen_random_uuid();
  employee_a uuid; employee_b uuid; outsider uuid;
  board_uuid uuid; task_uuid uuid; own_task uuid; due_task uuid;
  today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date;
  result jsonb; changed integer;
begin
  insert into public.departments (id, name) values
    (department_uuid, '[TEST] phòng ' || department_uuid),
    (other_department, '[TEST] phòng khác ' || other_department);
  perform pg_temp.test_employee(admin_user, 'admin', null);
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  employee_a := pg_temp.test_employee(user_a, 'A', department_uuid);
  employee_b := pg_temp.test_employee(user_b, 'B', department_uuid);
  outsider := pg_temp.test_employee(user_out, 'phòng khác', other_department);
  select b.id into board_uuid from public.boards b where b.dashboard_id =
    (public.crm_create_dashboard(admin_user, department_uuid, null, null) ->> 'dashboardId')::uuid;

  -- Giao việc cho A, B phối hợp → mỗi người một thông báo.
  task_uuid := public.crm_create_task(admin_user, board_uuid, '[TEST] việc', null, employee_a, null,
    null, null, array[employee_b]);
  if pg_temp.count_of(user_a, 'task_assigned') <> 1
    or pg_temp.count_of(user_b, 'task_collaborator_added') <> 1 then
    raise exception 'Giao việc / thêm phối hợp phải tạo thông báo';
  end if;

  -- Tự giao cho mình → không thông báo.
  own_task := public.crm_create_task(user_a, board_uuid, '[TEST] việc của tôi', null, employee_a, null,
    null, null);
  if exists (select 1 from public.notifications where task_id = own_task) then
    raise exception 'Không thông báo cho chính người thao tác';
  end if;

  -- Đổi người phụ trách sang B → B được báo giao việc.
  perform public.crm_update_task(admin_user, task_uuid, jsonb_build_object('assigneeId', employee_b));
  if pg_temp.count_of(user_b, 'task_assigned') <> 1 then
    raise exception 'Đổi người phụ trách phải báo người mới';
  end if;

  -- @mention: A (thuộc board) được báo; người phòng khác, không thuộc board → bỏ qua.
  perform public.crm_add_comment(user_b, task_uuid, '@A xem giúp', null, array[employee_a, outsider]);
  if pg_temp.count_of(user_a, 'comment_mention') <> 1
    or pg_temp.count_of(user_out, 'comment_mention') <> 0 then
    raise exception '@mention chỉ báo người thuộc board';
  end if;

  -- Sắp đến hạn: chạy hai lần chỉ tạo một thông báo.
  due_task := public.crm_create_task(admin_user, board_uuid, '[TEST] sắp đến hạn', null, employee_a,
    null, null, today + 1);
  result := public.crm_generate_due_notifications();
  if (result ->> 'dueSoon')::int < 1 then
    raise exception 'Phải tạo thông báo sắp đến hạn: %', result;
  end if;
  perform public.crm_generate_due_notifications();
  if (select count(*) from public.notifications
    where task_id = due_task and type = 'task_due_soon') <> 1 then
    raise exception 'Chạy lại không được tạo trùng thông báo sắp đến hạn';
  end if;

  -- Đánh dấu tất cả đã đọc: chỉ thông báo của chính người gọi.
  changed := public.crm_mark_notifications_read(user_a, null);
  if changed < 3 or exists (select 1 from public.notification_feed
    where recipient_user_id = user_a and read_at is null) then
    raise exception 'Phải đánh dấu đã đọc mọi thông báo của A (đổi %)', changed;
  end if;
  if not exists (select 1 from public.notification_feed
    where recipient_user_id = user_b and read_at is null) then
    raise exception 'Không được đánh dấu thông báo của người khác';
  end if;
  raise notice 'notifications: đạt';
end;
$$;

rollback;
