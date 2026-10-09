-- Kiểm tra bằng database thật: dự án (migration 20261009090000, BR-30, BR-31, Q6).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "projects: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  member_user uuid := gen_random_uuid();
  outsider_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  department_b uuid := gen_random_uuid();
  member_employee uuid; outsider_employee uuid; board_a uuid; done_column uuid;
  project_a uuid; project_b uuid; done_task uuid; late_task uuid; summary record; failed boolean;
begin
  insert into public.departments (id, name) values
    (department_a, '[TEST] phòng A ' || department_a), (department_b, '[TEST] phòng B ' || department_b);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-project-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (member_user, 'test-project-a-' || member_user || '@example.test', '{}', '{"full_name":"[TEST] A"}'),
    (outsider_user, 'test-project-b-' || outsider_user || '@example.test', '{}', '{"full_name":"[TEST] B"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = member_user returning e.id into member_employee;
  update public.employees e set department_id = department_b from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = outsider_user returning e.id into outsider_employee;
  perform public.crm_create_dashboard(admin_user, department_a, null, null);
  select b.id into board_a from public.boards b
  join public.department_dashboards d on d.id = b.dashboard_id where d.department_id = department_a;
  select id into done_column from public.board_columns where board_id = board_a and status = 'done';

  -- Chủ dự án tự là thành viên; người phòng khác không làm chủ / thành viên được (Q6).
  project_a := public.crm_create_project(admin_user, department_a, '[TEST] Ra mắt web', null,
    member_employee, 'active', null, null, '{}');
  if (select count(*) from public.project_members where project_id = project_a) <> 1 then
    raise exception 'Chủ dự án phải được thêm vào thành viên';
  end if;
  failed := false;
  begin
    perform public.crm_set_project_members(admin_user, project_a, array[outsider_employee]);
  exception when others then failed := sqlerrm = 'PROJECT_MEMBER_NOT_ELIGIBLE';
  end;
  if not failed then raise exception 'Người phòng khác không được làm thành viên dự án'; end if;

  -- Tên không trùng trong phòng (không phân biệt hoa thường).
  failed := false;
  begin
    perform public.crm_create_project(admin_user, department_a, '[test] RA MẮT WEB', null, null,
      null, null, null, '{}');
  exception when unique_violation then failed := sqlerrm like '%projects_department_name_key%';
  end;
  if not failed then raise exception 'Tên dự án trùng trong phòng phải bị chặn'; end if;

  -- BR-30: task chỉ gắn dự án cùng phòng — RPC báo lỗi rõ, khoá ngoại ghép chặn cả khi ghi thẳng.
  project_b := public.crm_create_project(admin_user, department_b, '[TEST] Dự án phòng B', null, null,
    null, null, null, '{}');
  failed := false;
  begin
    perform public.crm_create_task(admin_user, board_a, '[TEST] sai phòng', null, member_employee,
      null, null, null, '{}', project_b);
  exception when others then failed := sqlerrm = 'PROJECT_NOT_IN_DEPARTMENT';
  end;
  if not failed then raise exception 'RPC phải chặn dự án khác phòng'; end if;
  done_task := public.crm_create_task(admin_user, board_a, '[TEST] xong', null, member_employee,
    null, null, null, '{}', project_a);
  failed := false;
  begin
    update public.tasks set project_id = project_b where id = done_task;
  exception when foreign_key_violation then failed := sqlerrm like '%tasks_project_department_fk%';
  end;
  if not failed then raise exception 'Khoá ngoại ghép phải chặn dự án khác phòng'; end if;

  -- BR-31: tiến độ từ task thật; quá hạn theo ngày Việt Nam.
  late_task := public.crm_create_task(admin_user, board_a, '[TEST] trễ', null, member_employee,
    null, null, ((now() at time zone 'Asia/Ho_Chi_Minh')::date - 1), '{}', project_a);
  perform public.crm_move_task(admin_user, done_task, done_column, null, null);
  select * into summary from public.project_summaries where id = project_a;
  if summary.task_total <> 2 or summary.task_done <> 1 or summary.task_overdue <> 1
    or summary.member_count <> 1 or summary.board_id <> board_a then
    raise exception 'Tiến độ dự án sai: %', summary;
  end if;
  if (select project_name from public.task_cards where id = late_task) <> '[TEST] Ra mắt web' then
    raise exception 'Thẻ task phải có tên dự án';
  end if;

  -- Bỏ task khỏi dự án: activity project_changed + lịch sử dự án; task lưu trữ không tính tiến độ.
  perform public.crm_update_task(admin_user, late_task, '{"projectId": null}');
  if not exists (select 1 from public.task_activities
    where task_id = late_task and action = 'project_changed' and to_value is null) then
    raise exception 'Đổi dự án phải ghi activity project_changed';
  end if;
  if not exists (select 1 from public.project_activity_feed
    where project_id = project_a and action = 'project.task_removed') then
    raise exception 'Lịch sử dự án phải ghi task bị bỏ ra';
  end if;
  perform public.crm_archive_task(admin_user, done_task);
  if (select task_total from public.project_summaries where id = project_a) <> 0 then
    raise exception 'Task đã lưu trữ không tính vào tiến độ';
  end if;

  -- Dự án đã lưu trữ không gắn được vào task; khôi phục được.
  perform public.crm_archive_project(admin_user, project_a);
  failed := false;
  begin
    perform public.crm_update_task(admin_user, late_task, jsonb_build_object('projectId', project_a));
  exception when others then failed := sqlerrm = 'PROJECT_NOT_FOUND';
  end;
  if not failed then raise exception 'Dự án đã lưu trữ không gắn được vào task'; end if;
  perform public.crm_restore_project(admin_user, project_a);
  perform public.crm_update_project(admin_user, project_a, '{"status": "on_hold", "name": "[TEST] Đổi tên"}');
  if not exists (select 1 from public.project_activity_feed
    where project_id = project_a and action = 'project.update') then
    raise exception 'Sửa dự án phải ghi lịch sử';
  end if;

  raise notice 'projects: đạt';
end;
$$;

rollback;
