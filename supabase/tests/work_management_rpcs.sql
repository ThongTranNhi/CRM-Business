-- Kiểm tra bằng database thật các quy tắc Work Management Đợt 2 (BR-04, BR-11 → BR-14, BR-21, BR-53).
-- Chạy trong SQL Editor ở môi trường dev, sau migration 20261006090800. Kết thúc bằng ROLLBACK nên không
-- để lại dữ liệu. Thành công: hiện thông báo "work_management_rpcs: đạt". Sai: dừng bằng exception.
begin;

create function pg_temp.expect_error(statement text, expected text) returns void
language plpgsql as $$
begin
  execute statement;
  raise exception 'Mong đợi lỗi % nhưng câu lệnh chạy được: %', expected, statement;
exception when others then
  if sqlerrm <> expected then raise exception 'Mong đợi lỗi %, nhận %', expected, sqlerrm; end if;
end;
$$;

-- Tài khoản thử: trigger đăng ký tạo sẵn app_accounts + employees; trả employees.id.
create function pg_temp.test_employee(user_uuid uuid, label text, department_uuid uuid) returns uuid
language plpgsql as $$
declare employee_uuid uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  values (user_uuid, 'test-wm-' || user_uuid || '@example.test', '{}',
    jsonb_build_object('full_name', '[TEST] ' || label));
  update public.employees e set department_id = department_uuid from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = user_uuid
  returning e.id into employee_uuid;
  return employee_uuid;
end;
$$;

do $$
declare
  admin_user uuid := gen_random_uuid();
  department_uuid uuid := gen_random_uuid();
  other_department uuid := gen_random_uuid();
  first_employee uuid; second_employee uuid; third_employee uuid; outsider uuid;
  board_uuid uuid; result jsonb; first_task uuid; second_task uuid; task_row public.tasks;
begin
  insert into public.departments (id, name) values
    (department_uuid, '[TEST] phòng ' || department_uuid),
    (other_department, '[TEST] phòng khác ' || other_department);
  perform pg_temp.test_employee(admin_user, 'admin', null);
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  first_employee := pg_temp.test_employee(gen_random_uuid(), 'một', department_uuid);
  second_employee := pg_temp.test_employee(gen_random_uuid(), 'hai', department_uuid);
  third_employee := pg_temp.test_employee(gen_random_uuid(), 'ba', department_uuid);
  outsider := pg_temp.test_employee(gen_random_uuid(), 'ngoài', other_department);

  -- BR-04, BR-10: tạo lần 2 trả Dashboard cũ; board có đúng 3 cột.
  result := public.crm_create_dashboard(admin_user, department_uuid, null, null);
  if not (result ->> 'created')::boolean then raise exception 'Lần đầu phải tạo Dashboard'; end if;
  if (public.crm_create_dashboard(admin_user, department_uuid, null, null)) ->> 'dashboardId'
    <> result ->> 'dashboardId' then raise exception 'Lần 2 phải trả Dashboard cũ'; end if;
  select b.id into board_uuid from public.boards b where b.dashboard_id = (result ->> 'dashboardId')::uuid;
  if (select count(*) from public.board_columns where board_id = board_uuid) <> 3 then
    raise exception 'Board phải có 3 cột';
  end if;

  -- BR-11, BR-12: tạo task kèm ngày bắt đầu + người phối hợp trong 1 giao dịch; department_id theo Dashboard.
  first_task := public.crm_create_task(admin_user, board_uuid, '[TEST] việc 1', null, first_employee,
    null, current_date, current_date + 7, array[third_employee]);
  select * into task_row from public.tasks where id = first_task;
  if task_row.department_id <> department_uuid or task_row.start_date <> current_date then
    raise exception 'Task phải có department_id của Dashboard và start_date';
  end if;
  if not exists (select 1 from public.task_activities
    where task_id = first_task and action = 'collaborators_changed') then
    raise exception 'Tạo task có người phối hợp phải ghi collaborators_changed';
  end if;
  if (select collaborators -> 0 ->> 'name' from public.task_cards where id = first_task) <> '[TEST] ba' then
    raise exception 'task_cards.collaborators phải có tên người phối hợp';
  end if;
  perform pg_temp.expect_error(format('select public.crm_create_task(%L, %L, %L, null, %L, null, %L, %L)',
    admin_user, board_uuid, '[TEST] sai ngày', first_employee, current_date + 1, current_date),
    'new row for relation "tasks" violates check constraint "tasks_date_range_check"');
  perform pg_temp.expect_error(format('select public.crm_create_task(%L, %L, %L, null, null, null, null, null)',
    admin_user, board_uuid, '[TEST] thiếu người'), 'ASSIGNEE_REQUIRED');

  -- BR-13, BR-14: started_at lần đầu; completed_at/by khi xong; kéo ngược → xoá, có activity reopened.
  perform public.crm_move_task(admin_user, first_task, 'in_progress', null, null);
  perform public.crm_move_task(admin_user, first_task, 'done', null, null);
  select * into task_row from public.tasks where id = first_task;
  if task_row.started_at is null or task_row.completed_at is null or task_row.completed_by is null then
    raise exception 'Phải có started_at, completed_at, completed_by';
  end if;
  perform public.crm_move_task(admin_user, first_task, 'todo', null, null);
  select * into task_row from public.tasks where id = first_task;
  if task_row.completed_at is not null or task_row.completed_by is not null
    or not exists (select 1 from public.task_activities where task_id = first_task and action = 'reopened') then
    raise exception 'Kéo khỏi Đã hoàn thành phải xoá completed_* và ghi reopened';
  end if;

  -- Thứ tự: thả task 2 ngay dưới task 1.
  second_task := public.crm_create_task(admin_user, board_uuid, '[TEST] việc 2', null, first_employee,
    null, null, null);
  perform public.crm_move_task(admin_user, second_task, 'todo', first_task, null);
  if (select position from public.tasks where id = second_task)
    <= (select position from public.tasks where id = first_task) then
    raise exception 'Task 2 phải nằm dưới task 1';
  end if;

  -- BR-12: người phụ trách không là người phối hợp; người mới thêm phải thuộc board.
  perform pg_temp.expect_error(format('select public.crm_set_task_collaborators(%L, %L, array[%L]::uuid[])',
    admin_user, first_task, first_employee), 'COLLABORATOR_IS_ASSIGNEE');
  perform pg_temp.expect_error(format('select public.crm_set_task_collaborators(%L, %L, array[%L]::uuid[])',
    admin_user, first_task, outsider), 'EMPLOYEE_NOT_IN_BOARD');

  -- Người phối hợp cũ đã chuyển phòng: vẫn giữ được khi thêm người khác, và gỡ được.
  update public.employees set department_id = other_department where id = third_employee;
  perform public.crm_set_task_collaborators(admin_user, first_task, array[third_employee, second_employee]);
  perform public.crm_set_task_collaborators(admin_user, first_task, array[second_employee]);
  if app_private.crm_collaborator_ids(first_task) <> array[second_employee] then
    raise exception 'Phải sửa được danh sách có người phối hợp đã chuyển phòng';
  end if;

  -- Đổi người phụ trách thành người đang phối hợp → gỡ khỏi phối hợp, ghi collaborators_changed.
  perform public.crm_update_task(admin_user, first_task, jsonb_build_object('assigneeId', second_employee));
  if app_private.crm_collaborator_ids(first_task) <> '{}' or not exists (
    select 1 from public.task_activities where task_id = first_task
      and action = 'collaborators_changed' and to_value -> 'employeeIds' = '[]'::jsonb) then
    raise exception 'Người phụ trách mới phải bị gỡ khỏi phối hợp, có activity';
  end if;

  -- BR-21: activity chỉ INSERT.
  perform pg_temp.expect_error('update public.task_activities set action = action',
    'Audit logs are append-only');

  -- BR-53: người nhận ngoài board → từ chối, không bàn giao; người cùng phòng → bàn giao task 2.
  perform pg_temp.expect_error(format('select public.crm_delete_employee(%L, %L, null, %L)',
    admin_user, first_employee, outsider), 'HANDOVER_EMPLOYEE_NOT_IN_BOARD');
  perform public.crm_delete_employee(admin_user, first_employee, null, second_employee);
  if (select assignee_id from public.tasks where id = second_task) <> second_employee then
    raise exception 'Việc đang mở phải được bàn giao';
  end if;
  if not exists (select 1 from public.audit_logs where resource_id = first_employee
    and action = 'employee.delete' and (new_values ->> 'handedOverTaskCount')::int = 1) then
    raise exception 'Audit employee.delete phải ghi số việc bàn giao';
  end if;

  raise notice 'work_management_rpcs: đạt';
end;
$$;

rollback;
