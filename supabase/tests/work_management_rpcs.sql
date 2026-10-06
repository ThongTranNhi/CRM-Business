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

do $$
declare
  admin_user uuid := gen_random_uuid();
  first_user uuid := gen_random_uuid();
  second_user uuid := gen_random_uuid();
  department_uuid uuid := gen_random_uuid();
  first_employee uuid; second_employee uuid; board_uuid uuid; result jsonb;
  first_task uuid; second_task uuid; task_row public.tasks;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-wm-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (first_user, 'test-wm-1-' || first_user || '@example.test', '{}', '{"full_name":"[TEST] một"}'),
    (second_user, 'test-wm-2-' || second_user || '@example.test', '{}', '{"full_name":"[TEST] hai"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  insert into public.departments (id, name) values (department_uuid, '[TEST] phòng ' || department_uuid);
  update public.employees e set department_id = department_uuid from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id in (first_user, second_user);
  select e.id into first_employee from public.employees e
  join public.app_accounts a on a.id = e.account_id where a.auth_user_id = first_user;
  select e.id into second_employee from public.employees e
  join public.app_accounts a on a.id = e.account_id where a.auth_user_id = second_user;

  -- BR-04, BR-10: tạo lần 2 trả Dashboard cũ; board có đúng 3 cột.
  result := public.crm_create_dashboard(admin_user, department_uuid, null, null);
  if not (result ->> 'created')::boolean then raise exception 'Lần đầu phải tạo Dashboard'; end if;
  if (public.crm_create_dashboard(admin_user, department_uuid, null, null)) ->> 'dashboardId'
    <> result ->> 'dashboardId' then raise exception 'Lần 2 phải trả Dashboard cũ'; end if;
  select b.id into board_uuid from public.boards b where b.dashboard_id = (result ->> 'dashboardId')::uuid;
  if (select count(*) from public.board_columns where board_id = board_uuid) <> 3 then
    raise exception 'Board phải có 3 cột';
  end if;

  -- BR-11, BR-12: department_id lấy từ Dashboard; thiếu người phụ trách → lỗi.
  first_task := public.crm_create_task(admin_user, board_uuid, '[TEST] việc 1', null, first_employee, null, null);
  if (select department_id from public.tasks where id = first_task) <> department_uuid then
    raise exception 'Task phải có department_id của Dashboard';
  end if;
  perform pg_temp.expect_error(format('select public.crm_create_task(%L, %L, %L, null, null, null, null)',
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
  second_task := public.crm_create_task(admin_user, board_uuid, '[TEST] việc 2', null, first_employee, null, null);
  perform public.crm_move_task(admin_user, second_task, 'todo', first_task, null);
  if (select position from public.tasks where id = second_task)
    <= (select position from public.tasks where id = first_task) then
    raise exception 'Task 2 phải nằm dưới task 1';
  end if;

  -- BR-12: người phụ trách không là người phối hợp; đổi người phụ trách bỏ họ khỏi phối hợp.
  perform pg_temp.expect_error(format('select public.crm_set_task_collaborators(%L, %L, array[%L]::uuid[])',
    admin_user, first_task, first_employee), 'COLLABORATOR_IS_ASSIGNEE');
  perform public.crm_set_task_collaborators(admin_user, first_task, array[second_employee]);
  perform public.crm_update_task(admin_user, first_task, jsonb_build_object('assigneeId', second_employee));
  if exists (select 1 from public.task_collaborators where task_id = first_task) then
    raise exception 'Người phụ trách mới phải bị bỏ khỏi danh sách phối hợp';
  end if;

  -- BR-21: activity chỉ INSERT.
  perform pg_temp.expect_error('update public.task_activities set action = action',
    'Audit logs are append-only');

  -- BR-53: xoá người 1, bàn giao việc đang mở (task 2) cho người 2.
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
