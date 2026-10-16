-- Kiểm tra bằng database thật: migration 20261018090000_products.sql (Tài sản → Sản phẩm).
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "products: đạt". Sai: dừng bằng exception.
begin;

do $$
declare
  admin_user uuid := gen_random_uuid();
  owner_user uuid := gen_random_uuid();
  helper_user uuid := gen_random_uuid();
  other_user uuid := gen_random_uuid();
  department_a uuid := gen_random_uuid();
  department_b uuid := gen_random_uuid();
  owner_employee uuid; helper_employee uuid; other_employee uuid;
  project_a uuid; project_b uuid; product_uuid uuid; second_uuid uuid; summary record;
begin
  insert into public.departments (id, name) values
    (department_a, '[TEST] phòng A ' || department_a), (department_b, '[TEST] phòng B ' || department_b);
  insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
    (admin_user, 'test-prd-admin-' || admin_user || '@example.test', '{}', '{"full_name":"[TEST] admin"}'),
    (owner_user, 'test-prd-1-' || owner_user || '@example.test', '{}', '{"full_name":"[TEST] 1"}'),
    (helper_user, 'test-prd-2-' || helper_user || '@example.test', '{}', '{"full_name":"[TEST] 2"}'),
    (other_user, 'test-prd-3-' || other_user || '@example.test', '{}', '{"full_name":"[TEST] 3"}');
  update public.app_accounts set role = 'super_admin' where auth_user_id = admin_user;
  update public.employees e set department_id = department_a from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = owner_user returning e.id into owner_employee;
  -- Người cùng phụ trách ở phòng khác: được phép (mọi phòng).
  update public.employees e set department_id = department_b from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = helper_user returning e.id into helper_employee;
  update public.employees e set department_id = department_b from public.app_accounts a
  where a.id = e.account_id and a.auth_user_id = other_user returning e.id into other_employee;
  project_a := public.crm_create_project(admin_user, department_a, '[TEST] dự án A', null, owner_employee,
    'active', null, null);
  project_b := public.crm_create_project(admin_user, department_b, '[TEST] dự án B', null, helper_employee,
    'active', null, null);

  -- Tạo: người phụ trách chính bị bỏ khỏi danh sách cùng phụ trách.
  product_uuid := public.crm_create_product(admin_user, department_a, ' Web bán hàng ',
    'https://shop.example.test', 'Trang bán hàng', 'active', owner_employee, project_a,
    array[owner_employee, helper_employee, helper_employee]);
  select * into summary from public.product_summaries where id = product_uuid;
  if summary.name <> 'Web bán hàng' or summary.project_name <> '[TEST] dự án A'
    or jsonb_array_length(summary.members) <> 1
    or summary.members -> 0 ->> 'id' <> helper_employee::text then
    raise exception 'Tạo sản phẩm sai: %', row_to_json(summary);
  end if;
  if not exists (select 1 from public.audit_logs where resource_type = 'products'
      and resource_id = product_uuid and action = 'product.create') then
    raise exception 'Thiếu audit product.create';
  end if;

  -- Dự án phải cùng phòng (BR-30).
  begin
    perform public.crm_create_product(admin_user, department_a, 'Sai dự án', 'https://a.test', null,
      null, owner_employee, project_b);
    raise exception 'Dự án phòng khác phải bị chặn';
  exception when raise_exception then
    if sqlerrm <> 'PROJECT_NOT_IN_DEPARTMENT' then raise; end if;
  end;

  -- Chỉ link http(s).
  begin
    perform public.crm_create_product(admin_user, department_a, 'Link xấu', 'javascript:alert(1)', null,
      null, owner_employee);
    raise exception 'Link javascript: phải bị chặn';
  exception when check_violation then
    if sqlerrm not like '%products_url_check%' then raise; end if;
  end;

  -- Tên trùng trong phòng (không phân biệt hoa thường).
  begin
    perform public.crm_create_product(admin_user, department_a, 'WEB BÁN HÀNG', 'https://b.test', null,
      null, owner_employee);
    raise exception 'Tên trùng phải bị chặn';
  exception when unique_violation then
    if sqlerrm not like '%products_department_name_key%' then raise; end if;
  end;

  -- Đổi người phụ trách chính sang người đang cùng phụ trách → bỏ người đó khỏi danh sách cùng phụ trách.
  perform public.crm_update_product(admin_user, product_uuid,
    jsonb_build_object('ownerEmployeeId', helper_employee, 'description', '  '));
  select * into summary from public.product_summaries where id = product_uuid;
  if summary.owner_employee_id <> helper_employee or jsonb_array_length(summary.members) <> 0
    or summary.description is not null then
    raise exception 'Đổi người phụ trách chính sai: %', row_to_json(summary);
  end if;

  -- Thêm người đã nghỉ làm người cùng phụ trách → chặn.
  update public.employees set archived_at = now() where id = other_employee;
  begin
    perform public.crm_update_product(admin_user, product_uuid,
      jsonb_build_object('memberIds', jsonb_build_array(other_employee)));
    raise exception 'Người đã nghỉ không được thêm';
  exception when raise_exception then
    if sqlerrm <> 'PRODUCT_PERSON_NOT_FOUND' then raise; end if;
  end;

  -- Lưu trữ: ẩn khỏi thao tác ghi; tên dùng lại được.
  perform public.crm_archive_product(admin_user, product_uuid);
  begin
    perform public.crm_update_product(admin_user, product_uuid, '{"name":"Mới"}'::jsonb);
    raise exception 'Sản phẩm đã lưu trữ không sửa được';
  exception when raise_exception then
    if sqlerrm <> 'PRODUCT_NOT_FOUND' then raise; end if;
  end;
  second_uuid := public.crm_create_product(admin_user, department_a, 'Web bán hàng',
    'https://shop.example.test', null, null, owner_employee);

  -- Phòng đã xoá → không tạo / sửa được.
  update public.departments set archived_at = now() where id = department_a;
  begin
    perform public.crm_update_product(admin_user, second_uuid, '{"status":"paused"}'::jsonb);
    raise exception 'Phòng đã xoá phải chặn ghi';
  exception when raise_exception then
    if sqlerrm <> 'DEPARTMENT_NOT_FOUND' then raise; end if;
  end;

  raise notice 'products: đạt';
end;
$$;

rollback;
