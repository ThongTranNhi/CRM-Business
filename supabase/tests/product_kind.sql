-- Kiểm tra bằng database thật: migration 20261022090000_product_kind.sql (Loại sản phẩm).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "product_kind: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  owner_employee uuid; company_uuid uuid; partner_uuid uuid; summary record;
begin
  insert into public.departments (id, name) values (department_a, '[TEST] phòng A ' || department_a);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-pk-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-pk-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;

  -- Không gửi product_kind (cách gọi cũ) → sản phẩm công ty.
  company_uuid := public.crm_create_product(admin_user, department_a, 'Web công ty',
    'https://company.example.test', null, 'active', owner_employee);
  select * into summary from public.product_summaries where id = company_uuid;
  if summary.kind <> 'company' then raise exception 'Loại mặc định sai: %', summary.kind; end if;

  partner_uuid := public.crm_create_product(admin_user, department_a, 'Web đối tác',
    'https://partner.example.test', null, 'paused', owner_employee, null, '{}', 'partner');
  select * into summary from public.product_summaries where id = partner_uuid;
  if summary.kind <> 'partner' or summary.status <> 'paused' then
    raise exception 'Tạo sản phẩm hợp tác sai: %', row_to_json(summary);
  end if;
  if not exists (select 1 from public.audit_logs where resource_id = partner_uuid
      and action = 'product.create' and new_values ->> 'kind' = 'partner') then
    raise exception 'Audit tạo thiếu kind';
  end if;

  -- Loại không hợp lệ bị check chặn.
  begin
    perform public.crm_create_product(admin_user, department_a, 'Sai loại', 'https://x.example.test', null,
      null, owner_employee, null, '{}', 'vendor');
    raise exception 'Loại sai phải bị chặn';
  exception when check_violation then null;
  end;

  -- Sửa loại: chỉ đổi kind, giữ trạng thái; audit có cả cũ và mới.
  perform public.crm_update_product(admin_user, company_uuid, '{"kind":"partner"}');
  select * into summary from public.product_summaries where id = company_uuid;
  if summary.kind <> 'partner' or summary.status <> 'active' then
    raise exception 'Sửa loại sai: %', row_to_json(summary);
  end if;
  if not exists (select 1 from public.audit_logs where resource_id = company_uuid
      and action = 'product.update' and old_values ->> 'kind' = 'company'
      and new_values ->> 'kind' = 'partner') then
    raise exception 'Audit sửa loại sai';
  end if;

  -- PATCH không có khoá kind → giữ nguyên.
  perform public.crm_update_product(admin_user, company_uuid, '{"status":"paused"}');
  select * into summary from public.product_summaries where id = company_uuid;
  if summary.kind <> 'partner' then raise exception 'PATCH khác làm đổi loại'; end if;

  -- Chỉ còn một hàm tạo (bản 9 tham số đã bỏ).
  if (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'crm_create_product') <> 1 then
    raise exception 'Còn nhiều hơn một crm_create_product';
  end if;
  if has_function_privilege('authenticated',
      'public.crm_create_product(uuid, uuid, text, text, text, text, uuid, uuid, uuid[], text)', 'execute') then
    raise exception 'authenticated không được gọi crm_create_product';
  end if;
  if has_table_privilege('authenticated', 'public.product_summaries', 'select') then
    raise exception 'authenticated không được đọc product_summaries';
  end if;

  raise notice 'product_kind: đạt';
end;
$$;

rollback;
