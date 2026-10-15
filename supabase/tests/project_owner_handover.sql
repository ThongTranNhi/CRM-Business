-- Kiểm tra bằng database thật bàn giao quyền chủ dự án khi xoá nhân viên (BR-53, Q6 — migration
-- 20261012090000): chỉ tính / bàn giao dự án còn ghi được; người nhận không hợp lệ thì báo đúng dự án nào và
-- không xoá; crm_delete_employee trả số dự án thật. Chạy trong SQL Editor ở môi trường dev.
-- Kết thúc bằng ROLLBACK. Thành công: "project_owner_handover: đạt". Sai: dừng bằng exception.
begin;

create function pg_temp.test_employee(user_uuid uuid, label text, department_uuid uuid) returns uuid
language plpgsql as $$
declare employee_uuid uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  values (user_uuid, 'test-poh-' || user_uuid || '@example.test', '{}',
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
  open_department uuid := gen_random_uuid();
  closed_department uuid := gen_random_uuid();
  other_department uuid := gen_random_uuid();
  leaver uuid; receiver uuid; outsider uuid;
  open_project uuid; closed_project uuid;
  result jsonb; error_message text; error_detail text;
begin
  insert into public.departments (id, name) values
    (open_department, '[TEST] phòng mở ' || open_department),
    (closed_department, '[TEST] phòng sẽ xoá ' || closed_department),
    (other_department, '[TEST] phòng khác ' || other_department);
  perform pg_temp.test_employee(admin_user, 'admin', null);
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  leaver := pg_temp.test_employee(gen_random_uuid(), 'người nghỉ', closed_department);
  receiver := pg_temp.test_employee(gen_random_uuid(), 'người nhận', open_department);
  outsider := pg_temp.test_employee(gen_random_uuid(), 'phòng khác', other_department);

  closed_project := public.crm_create_project(admin_user, closed_department, '[TEST] Dự án phòng đã xoá',
    null, leaver, 'active', null, null);
  update public.employees set department_id = open_department where id = leaver;
  -- Người nhận chưa là thành viên → bàn giao phải thêm vào thành viên.
  open_project := public.crm_create_project(admin_user, open_department, '[TEST] Dự án phòng mở',
    null, leaver, 'active', null, null);
  -- BR-06: phòng ban đã xoá → dự án chỉ đọc; không tính, không bàn giao.
  update public.departments set archived_at = now() where id = closed_department;

  if (select count(*) from public.owned_writable_projects where owner_employee_id = leaver) <> 1 then
    raise exception 'Chỉ đếm dự án còn ghi được';
  end if;

  -- Người nhận không hợp lệ với dự án (Q6) → báo đúng dự án bị chặn, không xoá nhân viên.
  begin
    perform public.crm_delete_employee(admin_user, leaver, null, outsider);
    raise exception 'Bàn giao dự án cho người phòng khác phải bị chặn';
  exception when others then
    get stacked diagnostics error_message = message_text, error_detail = pg_exception_detail;
  end;
  if error_message <> 'HANDOVER_EMPLOYEE_NOT_PROJECT_ELIGIBLE' then
    raise exception 'Mong đợi HANDOVER_EMPLOYEE_NOT_PROJECT_ELIGIBLE, nhận %', error_message;
  end if;
  if error_detail::jsonb -> 0 ->> 'projectId' <> open_project::text
    or jsonb_array_length(error_detail::jsonb) <> 1 then
    raise exception 'Chi tiết lỗi phải nêu đúng dự án bị chặn: %', error_detail;
  end if;
  if exists (select 1 from public.employees where id = leaver and archived_at is not null) then
    raise exception 'Bị chặn thì không được xoá nhân viên';
  end if;

  -- Bàn giao hợp lệ: người nhận thành chủ dự án và vào danh sách thành viên; dự án phòng đã xoá giữ nguyên.
  result := public.crm_delete_employee(admin_user, leaver, null, receiver);
  if (result ->> 'ownedProjectCount')::integer <> 1
    or (result ->> 'handedOverProjectCount')::integer <> 1 then
    raise exception 'Số dự án trả về sai: %', result;
  end if;
  if (select owner_employee_id from public.projects where id = open_project) <> receiver then
    raise exception 'Người nhận phải thành chủ dự án';
  end if;
  if not exists (select 1 from public.project_members
    where project_id = open_project and employee_id = receiver) then
    raise exception 'Chủ dự án mới phải là thành viên';
  end if;
  if (select owner_employee_id from public.projects where id = closed_project) <> leaver then
    raise exception 'Dự án của phòng đã xoá phải giữ nguyên chủ dự án';
  end if;
  if not exists (select 1 from public.audit_logs where resource_type = 'projects'
    and resource_id = open_project and action = 'project.update'
    and new_values ->> 'ownerEmployeeId' = receiver::text) then
    raise exception 'Bàn giao phải ghi lịch sử project.update kèm chủ dự án mới';
  end if;
  if not exists (select 1 from public.audit_logs where resource_type = 'projects'
    and resource_id = open_project and action = 'project.members') then
    raise exception 'Thêm chủ mới vào thành viên phải ghi lịch sử project.members';
  end if;
  raise notice 'project_owner_handover: đạt';
end;
$$;

rollback;
