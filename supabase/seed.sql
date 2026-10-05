-- DỮ LIỆU THỬ — CHỈ CHẠY Ở MÔI TRƯỜNG DEV. KHÔNG chạy trên production.
-- 4 phòng ban (1 phòng chưa có trưởng phòng) và 12 nhân viên chưa có tài khoản đăng nhập.
-- Chạy lại nhiều lần không tạo bản trùng (id cố định + on conflict do nothing).
-- Tài khoản thử theo role: docs/development/test-accounts.md.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090300_employee_soft_delete.sql') then
    raise exception 'Chạy đủ migration (tới 20261006090300_employee_soft_delete.sql) trước khi seed';
  end if;
end;
$$;

-- Khoá ngoại trưởng phòng là deferred nên có thể chèn phòng ban trước nhân viên trong cùng giao dịch.
insert into public.departments (id, name, manager_employee_id) values
  ('5eed0000-0000-4000-a000-000000000d01', 'Kinh doanh', '5eed0000-0000-4000-a000-000000000e01'),
  ('5eed0000-0000-4000-a000-000000000d02', 'Kỹ thuật', '5eed0000-0000-4000-a000-000000000e04'),
  ('5eed0000-0000-4000-a000-000000000d03', 'Hành chính - Nhân sự', '5eed0000-0000-4000-a000-000000000e08'),
  ('5eed0000-0000-4000-a000-000000000d04', 'Marketing', null)
on conflict (id) do nothing;

insert into public.employees (id, employee_code, full_name, job_title, department_id) values
  ('5eed0000-0000-4000-a000-000000000e01', 'SEED-001', 'Nguyễn Minh Anh', 'Trưởng phòng Kinh doanh', '5eed0000-0000-4000-a000-000000000d01'),
  ('5eed0000-0000-4000-a000-000000000e02', 'SEED-002', 'Trần Quốc Bảo', 'Chuyên viên kinh doanh', '5eed0000-0000-4000-a000-000000000d01'),
  ('5eed0000-0000-4000-a000-000000000e03', 'SEED-003', 'Lê Thu Hà', 'Chuyên viên kinh doanh', '5eed0000-0000-4000-a000-000000000d01'),
  ('5eed0000-0000-4000-a000-000000000e04', 'SEED-004', 'Phạm Đức Huy', 'Trưởng phòng Kỹ thuật', '5eed0000-0000-4000-a000-000000000d02'),
  ('5eed0000-0000-4000-a000-000000000e05', 'SEED-005', 'Võ Thanh Tùng', 'Lập trình viên', '5eed0000-0000-4000-a000-000000000d02'),
  ('5eed0000-0000-4000-a000-000000000e06', 'SEED-006', 'Đặng Ngọc Lan', 'Kiểm thử phần mềm', '5eed0000-0000-4000-a000-000000000d02'),
  ('5eed0000-0000-4000-a000-000000000e07', 'SEED-007', 'Bùi Hoàng Nam', 'Lập trình viên', '5eed0000-0000-4000-a000-000000000d02'),
  ('5eed0000-0000-4000-a000-000000000e08', 'SEED-008', 'Hoàng Mai Phương', 'Trưởng phòng Hành chính - Nhân sự', '5eed0000-0000-4000-a000-000000000d03'),
  ('5eed0000-0000-4000-a000-000000000e09', 'SEED-009', 'Ngô Gia Khánh', 'Chuyên viên nhân sự', '5eed0000-0000-4000-a000-000000000d03'),
  ('5eed0000-0000-4000-a000-000000000e10', 'SEED-010', 'Đỗ Thảo Vy', 'Chuyên viên marketing', '5eed0000-0000-4000-a000-000000000d04'),
  ('5eed0000-0000-4000-a000-000000000e11', 'SEED-011', 'Phan Tuấn Kiệt', 'Thiết kế đồ hoạ', '5eed0000-0000-4000-a000-000000000d04'),
  ('5eed0000-0000-4000-a000-000000000e12', 'SEED-012', 'Trịnh Bích Ngọc', 'Nhân viên mới', null)
on conflict (id) do nothing;

commit;
