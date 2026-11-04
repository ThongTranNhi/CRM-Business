-- Kiểm tra bằng database thật: migration 20261103090000_issued_assets.sql (Tài sản được cấp).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "issued_assets: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  staff_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  staff_employee uuid; admin_employee uuid; laptop uuid; license uuid; monitor uuid; summary record;
begin
  insert into public.departments (id, name) values (department_a, '[TEST] phòng A ' || department_a);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-ia-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (staff_user, 'test-ia-1-' || staff_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}');
  update public.app_accounts set role = 'hr_admin' where auth_user_id = admin_user;
  select e.id into admin_employee from public.employees e join public.app_accounts a on a.id = e.account_id
  where a.auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = staff_user returning e.id into staff_employee;

  -- Nhân viên thường không ghi được.
  begin
    perform public.crm_create_issued_asset(staff_user, null, 'Không được', 'laptop', 'in_stock');
    raise exception 'Nhân viên thường phải bị chặn';
  exception when others then
    if sqlerrm <> 'FORBIDDEN' then raise; end if;
  end;

  laptop := public.crm_create_issued_asset(admin_user, 'LT-01', 'Laptop Dell', 'laptop', 'in_stock');
  license := public.crm_create_issued_asset(admin_user, null, 'Office 365', 'software', null, '2027-01-01');

  -- Mã trùng (không phân biệt hoa thường) bị chặn.
  begin
    perform public.crm_create_issued_asset(admin_user, 'lt-01', 'Laptop khác', 'laptop', 'in_stock');
    raise exception 'Mã trùng phải bị chặn';
  exception when unique_violation then null;
  end;

  -- Cấp cho cá nhân: trạng thái thành Đang cấp, view có người giữ và người cấp.
  perform public.crm_issue_asset(admin_user, laptop, jsonb_build_object('holderType', 'employee',
    'employeeId', staff_employee, 'issuerEmployeeId', admin_employee, 'issuedOn', '2026-11-01'));
  select * into summary from public.issued_asset_summaries where id = laptop;
  if summary.status <> 'issued' or summary.employee_id <> staff_employee
    or summary.issuer_employee_id <> admin_employee then
    raise exception 'Cấp cho cá nhân sai: %', row_to_json(summary);
  end if;

  -- Đang cấp: không cấp lần hai, không đổi trạng thái tay, không xoá.
  begin
    perform public.crm_issue_asset(admin_user, laptop, jsonb_build_object('holderType', 'company',
      'issuerEmployeeId', admin_employee, 'issuedOn', '2026-11-02'));
    raise exception 'Cấp lần hai phải bị chặn';
  exception when others then
    if sqlerrm <> 'ASSET_NOT_AVAILABLE' then raise; end if;
  end;
  begin
    perform public.crm_update_issued_asset(admin_user, laptop, '{"status":"repair"}');
    raise exception 'Đổi trạng thái khi đang cấp phải bị chặn';
  exception when others then
    if sqlerrm <> 'ASSET_STATUS_LOCKED' then raise; end if;
  end;
  begin
    perform public.crm_archive_issued_asset(admin_user, laptop);
    raise exception 'Xoá tài sản đang cấp phải bị chặn';
  exception when others then
    if sqlerrm <> 'ASSET_IN_USE' then raise; end if;
  end;

  -- Ngày trả trước ngày cấp bị chặn; thu hồi đúng → Trong kho, lịch sử còn.
  begin
    perform public.crm_return_asset(admin_user, laptop, '2026-10-01');
    raise exception 'Ngày trả trước ngày cấp phải bị chặn';
  exception when check_violation then null;
  end;
  perform public.crm_return_asset(admin_user, laptop, '2026-11-03', 'Đổi máy');
  select * into summary from public.issued_asset_summaries where id = laptop;
  if summary.status <> 'in_stock' or summary.assignment_id is not null then
    raise exception 'Thu hồi sai: %', row_to_json(summary);
  end if;

  -- Cấp lại cho phòng ban, rồi một license cho cả công ty.
  perform public.crm_issue_asset(admin_user, laptop, jsonb_build_object('holderType', 'department',
    'departmentId', department_a, 'issuerEmployeeId', staff_employee, 'issuedOn', '2026-11-03'));
  perform public.crm_issue_asset(admin_user, license, jsonb_build_object('holderType', 'company',
    'issuerEmployeeId', admin_employee, 'issuedOn', '2026-11-03', 'note', 'Gói toàn công ty'));
  select * into summary from public.issued_asset_summaries where id = laptop;
  if summary.holder_type <> 'department' or summary.department_id <> department_a then
    raise exception 'Cấp cho phòng sai: %', row_to_json(summary);
  end if;
  select * into summary from public.issued_asset_summaries where id = license;
  if summary.holder_type <> 'company' or summary.issue_note <> 'Gói toàn công ty' then
    raise exception 'Cấp cho công ty sai: %', row_to_json(summary);
  end if;
  if (select count(*) from public.asset_assignment_rows where asset_id = laptop) <> 2 then
    raise exception 'Lịch sử cấp phải có 2 lượt';
  end if;

  -- Đối tượng không khớp loại bị chặn (cá nhân mà không có nhân viên).
  perform public.crm_return_asset(admin_user, license, '2026-11-03');
  begin
    perform public.crm_issue_asset(admin_user, license, jsonb_build_object('holderType', 'employee',
      'issuerEmployeeId', admin_employee, 'issuedOn', '2026-11-03'));
    raise exception 'Cấp cá nhân thiếu nhân viên phải bị chặn';
  exception when check_violation then null;
  end;

  -- Thêm tài sản và cấp luôn cho công ty trong cùng giao dịch.
  monitor := public.crm_create_issued_asset(admin_user, null, 'Màn hình phòng họp', 'monitor', null, null, null,
    jsonb_build_object('holderType', 'company', 'issuerEmployeeId', admin_employee, 'issuedOn', '2026-11-03'));
  select * into summary from public.issued_asset_summaries where id = monitor;
  if summary.status <> 'issued' or summary.holder_type <> 'company' then
    raise exception 'Thêm và cấp luôn sai: %', row_to_json(summary);
  end if;
  if (select count(*) from public.audit_logs where resource_id = monitor) <> 2 then
    raise exception 'Thêm và cấp luôn phải ghi 2 audit';
  end if;

  -- Cấp luôn cho người không tồn tại → không tạo tài sản.
  begin
    perform public.crm_create_issued_asset(admin_user, null, '[TEST] không tạo', 'phone', null, null, null,
      jsonb_build_object('holderType', 'employee', 'employeeId', gen_random_uuid(),
        'issuerEmployeeId', admin_employee, 'issuedOn', '2026-11-03'));
    raise exception 'Cấp luôn cho người không tồn tại phải bị chặn';
  exception when others then
    if sqlerrm <> 'ASSET_PERSON_NOT_FOUND' then raise; end if;
  end;
  if exists (select 1 from public.issued_assets where name = '[TEST] không tạo') then
    raise exception 'Cấp lỗi mà vẫn tạo tài sản';
  end if;

  if (select count(*) from public.audit_logs where resource_type = 'issued_assets'
      and resource_id in (laptop, license)) <> 7 then
    raise exception 'Audit thiếu: %', (select count(*) from public.audit_logs
      where resource_type = 'issued_assets' and resource_id in (laptop, license));
  end if;
  if has_function_privilege('authenticated', 'public.crm_issue_asset(uuid, uuid, jsonb)', 'execute') then
    raise exception 'authenticated không được gọi crm_issue_asset';
  end if;
  if has_table_privilege('authenticated', 'public.issued_asset_summaries', 'select') then
    raise exception 'authenticated không được đọc issued_asset_summaries';
  end if;

  raise notice 'issued_assets: đạt';
end;
$$;

rollback;
