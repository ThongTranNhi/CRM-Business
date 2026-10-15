-- Kiểm tra bằng database thật bàn giao việc khi xoá nhân viên (BR-53, sửa review L6 —
-- migration 20261008090000): chỉ tính / bàn giao việc trên Dashboard còn ghi được; người nhận bị chặn
-- thì báo đúng việc nào; crm_delete_employee trả số việc thật. Chạy trong SQL Editor ở môi trường dev.
-- Kết thúc bằng ROLLBACK. Thành công: "employee_handover: đạt". Sai: dừng bằng exception.
begin;

create function pg_temp.test_employee(user_uuid uuid, label text, department_uuid uuid) returns uuid
language plpgsql as $$
declare employee_uuid uuid;
begin
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
  values (user_uuid, 'test-ho-' || user_uuid || '@example.test', '{}',
    jsonb_build_object('full_name', '[TEST] ' || label));
  update public.employees e set department_id = department_uuid from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = user_uuid
  returning e.id into employee_uuid;
  return employee_uuid;
end;
$$;

create function pg_temp.board_of(dashboard jsonb) returns uuid language sql as $$
  select b.id from public.boards b where b.dashboard_id = (dashboard ->> 'dashboardId')::uuid;
$$;

do $$
declare
  admin_user uuid := gen_random_uuid();
  open_department uuid := gen_random_uuid();
  closed_department uuid := gen_random_uuid();
  other_department uuid := gen_random_uuid();
  leaver uuid; receiver uuid; outsider uuid;
  open_board uuid; closed_board uuid; open_task uuid; closed_task uuid;
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

  open_board := pg_temp.board_of(public.crm_create_dashboard(admin_user, open_department, null, null));
  closed_board := pg_temp.board_of(public.crm_create_dashboard(admin_user, closed_department, null, null));
  closed_task := public.crm_create_task(admin_user, closed_board, '[TEST] việc phòng đã xoá', null,
    leaver, null, null, null);
  update public.employees set department_id = open_department where id = leaver;
  open_task := public.crm_create_task(admin_user, open_board, '[TEST] việc phòng mở', null,
    leaver, null, null, null);
  -- BR-06: phòng ban đã xoá → Dashboard chỉ đọc; việc của nó không tính, không bàn giao.
  update public.departments set archived_at = now() where id = closed_department;

  if (select count(*) from public.open_assigned_tasks where assignee_id = leaver) <> 1 then
    raise exception 'Chỉ đếm việc trên Dashboard còn ghi được';
  end if;

  -- Người nhận không thuộc board → báo đúng việc bị chặn (không kể việc ở phòng đã xoá).
  begin
    perform public.crm_delete_employee(admin_user, leaver, null, outsider);
    raise exception 'Bàn giao cho người ngoài board phải bị chặn';
  exception when others then
    get stacked diagnostics error_message = message_text, error_detail = pg_exception_detail;
  end;
  if error_message <> 'HANDOVER_EMPLOYEE_NOT_IN_BOARD' then
    raise exception 'Mong đợi HANDOVER_EMPLOYEE_NOT_IN_BOARD, nhận %', error_message;
  end if;
  if error_detail::jsonb -> 0 ->> 'taskId' <> open_task::text
    or jsonb_array_length(error_detail::jsonb) <> 1 then
    raise exception 'Chi tiết lỗi phải nêu đúng việc bị chặn: %', error_detail;
  end if;
  if exists (select 1 from public.employees where id = leaver and archived_at is not null) then
    raise exception 'Bị chặn thì không được xoá nhân viên';
  end if;

  -- Bàn giao hợp lệ: trả số việc thật; việc ở Dashboard chỉ đọc giữ nguyên người phụ trách.
  result := public.crm_delete_employee(admin_user, leaver, null, receiver);
  if (result ->> 'openTaskCount')::integer <> 1 or (result ->> 'handedOverTaskCount')::integer <> 1 then
    raise exception 'Số việc trả về sai: %', result;
  end if;
  if (select assignee_id from public.tasks where id = open_task) <> receiver then
    raise exception 'Việc phòng mở phải chuyển cho người nhận';
  end if;
  if (select assignee_id from public.tasks where id = closed_task) <> leaver then
    raise exception 'Việc ở Dashboard chỉ đọc không được bàn giao';
  end if;
  raise notice 'employee_handover: đạt';
end;
$$;

rollback;
