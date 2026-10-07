-- Kiểm tra bằng database thật: view task_trash (thùng rác công việc).
-- Chạy trong SQL Editor ở môi trường dev, sau migration 20261007100000. Kết thúc bằng ROLLBACK nên không
-- để lại dữ liệu. Thành công: hiện thông báo "task_trash: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  member_user uuid := gen_random_uuid();
  department_uuid uuid := gen_random_uuid();
  member_employee uuid; board_uuid uuid; kept_task uuid; deleted_task uuid; row_data record;
begin
  insert into public.departments (id, name) values (department_uuid, '[TEST] phòng ' || department_uuid);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-trash-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (member_user, 'test-trash-member-' || member_user || '@example.test', '{}', '{"full_name":"[TEST] một"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_uuid from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = member_user
  returning e.id into member_employee;
  perform public.crm_create_dashboard(admin_user, department_uuid, null, null);
  select b.id into board_uuid from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_uuid;
  kept_task := public.crm_create_task(admin_user, board_uuid, '[TEST] giữ lại', null, member_employee,
    null, null, null);
  deleted_task := public.crm_create_task(admin_user, board_uuid, '[TEST] đã xoá', null, member_employee,
    null, null, null);
  perform public.crm_archive_task(admin_user, deleted_task);

  if exists (select 1 from public.task_trash where id = kept_task) then
    raise exception 'Task chưa xoá không được nằm trong thùng rác';
  end if;
  select * into row_data from public.task_trash where id = deleted_task;
  if not found then raise exception 'Task đã xoá phải nằm trong thùng rác'; end if;
  if row_data.column_name <> 'VIỆC CẦN LÀM' or row_data.assignee_name <> '[TEST] một'
    or row_data.archived_by_name <> '[TEST] admin' or row_data.board_id <> board_uuid then
    raise exception 'Thùng rác phải có cột cũ, người phụ trách, người xoá: %', row_data;
  end if;

  -- Khôi phục → rời thùng rác.
  perform public.crm_restore_task(admin_user, deleted_task);
  if exists (select 1 from public.task_trash where id = deleted_task) then
    raise exception 'Task đã khôi phục phải rời thùng rác';
  end if;

  raise notice 'task_trash: đạt';
end;
$$;

rollback;
