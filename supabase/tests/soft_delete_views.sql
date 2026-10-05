-- Kiểm tra bằng database thật: phòng ban / nhân viên đã xoá không còn trong view dùng cho ô chọn.
-- Chạy trong SQL Editor ở môi trường dev. Kết thúc bằng ROLLBACK nên không để lại dữ liệu.
-- Thành công: hiện thông báo "soft_delete_views: đạt". Sai: dừng bằng exception mô tả lỗi.
begin;

do $$
declare
  test_department uuid := gen_random_uuid();
  test_employee uuid := gen_random_uuid();
begin
  insert into public.departments (id, name) values (test_department, 'TEST xoá mềm ' || test_department);
  insert into public.employees (id, full_name, department_id)
  values (test_employee, 'TEST nhân viên', test_department);

  if not exists (select 1 from public.active_departments where id = test_department)
    or not exists (select 1 from public.active_employees where id = test_employee) then
    raise exception 'Bản ghi mới phải có trong view active_*';
  end if;

  update public.employees set archived_at = now() where id = test_employee;
  update public.departments set archived_at = now() where id = test_department;

  if exists (select 1 from public.active_departments where id = test_department) then
    raise exception 'Phòng ban đã xoá vẫn xuất hiện trong active_departments';
  end if;
  if exists (select 1 from public.active_employees where id = test_employee) then
    raise exception 'Nhân viên đã xoá vẫn xuất hiện trong active_employees';
  end if;
  if not exists (select 1 from public.employee_directory
    where id = test_employee and archived_at is not null) then
    raise exception 'employee_directory phải giữ nhân viên đã xoá cho bộ lọc "Đã xoá"';
  end if;
  raise notice 'soft_delete_views: đạt';
end;
$$;

rollback;
