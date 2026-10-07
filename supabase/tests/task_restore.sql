-- Kiểm tra bằng database thật: xoá (lưu trữ) rồi hoàn tác công việc (BR-19, BR-21).
-- Chạy trong SQL Editor ở môi trường dev, sau migration 20261007090000. Kết thúc bằng ROLLBACK nên không
-- để lại dữ liệu. Thành công: hiện thông báo "task_restore: đạt". Sai: dừng bằng exception.
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
  member_user uuid := gen_random_uuid();
  department_uuid uuid := gen_random_uuid();
  member_employee uuid; board_uuid uuid; first_task uuid; second_task uuid; access jsonb;
begin
  insert into public.departments (id, name) values (department_uuid, '[TEST] phòng ' || department_uuid);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-restore-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (member_user, 'test-restore-member-' || member_user || '@example.test', '{}', '{"full_name":"[TEST] một"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_uuid from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = member_user
  returning e.id into member_employee;
  perform public.crm_create_dashboard(admin_user, department_uuid, null, null);
  select b.id into board_uuid from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_uuid;
  first_task := public.crm_create_task(admin_user, board_uuid, '[TEST] việc 1', null, member_employee,
    null, null, null);
  second_task := public.crm_create_task(admin_user, board_uuid, '[TEST] việc 2', null, member_employee,
    null, null, null);

  -- task_cards có created_by (board tính quyền xoá từng thẻ).
  if (select created_by from public.task_cards where id = first_task) is null then
    raise exception 'task_cards phải có created_by';
  end if;

  -- Chưa lưu trữ → hoàn tác báo không tìm thấy.
  perform pg_temp.expect_error(format('select public.crm_restore_task(%L, %L)', admin_user, first_task),
    'TASK_NOT_FOUND');

  perform public.crm_archive_task(admin_user, first_task);
  access := public.crm_work_access(admin_user, null, first_task);
  if access ->> 'taskId' is null or not (access ->> 'isArchived')::boolean then
    raise exception 'crm_work_access phải thấy task đã lưu trữ kèm isArchived';
  end if;
  if exists (select 1 from public.task_cards where id = first_task) then
    raise exception 'Task đã lưu trữ phải ẩn khỏi board';
  end if;

  -- Hoàn tác: hiện lại, về cuối cột cũ, có activity restored + audit task.restore.
  perform public.crm_restore_task(admin_user, first_task);
  if (select position from public.tasks where id = first_task)
    <= (select position from public.tasks where id = second_task) then
    raise exception 'Task hoàn tác phải nằm cuối cột cũ';
  end if;
  if not exists (select 1 from public.task_activities where task_id = first_task and action = 'restored')
    or not exists (select 1 from public.audit_logs where resource_id = first_task and action = 'task.restore') then
    raise exception 'Hoàn tác phải ghi activity restored và audit task.restore';
  end if;
  if (public.crm_work_access(admin_user, null, first_task) ->> 'isArchived')::boolean then
    raise exception 'Sau hoàn tác isArchived phải là false';
  end if;

  raise notice 'task_restore: đạt';
end;
$$;

rollback;
