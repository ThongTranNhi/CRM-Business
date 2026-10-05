# Database hồ sơ nhân viên

Thứ tự chạy migration và câu kiểm tra: [docs/changelog/migrations.md](../changelog/migrations.md).

## Phòng ban, xoá mềm, view đọc (Đợt 1 — 2026-10-06)

- `app_private.applied_migrations(name, applied_at)`: migration đã áp bằng SQL Editor. Mỗi migration mới
  kiểm tra file trước đã có trong bảng, cuối file tự ghi tên mình (migration 20261006090000).
- `departments.manager_employee_id` cho phép NULL = "Chưa có trưởng phòng" (BR-08). Khoá ngoại
  `(manager_employee_id, id) → employees(id, department_id)` giữ nguyên: có trưởng phòng thì người đó thuộc phòng.
- Tên phòng ban unique theo `lower(name)` **chỉ với phòng chưa xoá** (`departments_active_name_unique`),
  để tên phòng đã xoá được dùng lại (BR-09). Mã nhân viên tương tự (`employees_active_code_unique`).
- Xoá = xoá mềm: `departments.archived_at`, `employees.archived_at` (BR-09, BR-53, BR-55). Xoá nhân viên
  đồng thời đặt `app_accounts.status = 'disabled'` và xoá `auth.sessions`.
- View đọc (security_invoker, chỉ `service_role` được SELECT):
  - `active_departments`: phòng chưa xoá + `manager_name`, `member_count` (người chưa xoá).
  - `employee_directory`: mọi hồ sơ + phòng ban, trưởng phòng, tài khoản, `is_locked`, `archived_at`.
  - `active_employees`: `employee_directory` bỏ người đã xoá. Danh sách, ô chọn người, thành viên
    phòng và `/api/auth/me` đọc view này.
- RPC (chỉ `service_role` EXECUTE): `crm_create_department`, `crm_update_department`, `crm_move_employee`,
  `crm_delete_department`, `crm_restore_department`, `crm_delete_employee`, `crm_restore_employee`;
  `crm_admin_update_employee` được thay để đổi phòng của trưởng phòng không còn lỗi khoá ngoại.
  Hàm nội bộ trong `app_private`: `crm_actor`, `crm_lock_active_department`,
  `crm_assert_department_name_free`, `crm_assign_manager`.
- Kiểm tra bằng database thật: `supabase/tests/soft_delete_views.sql` (tự ROLLBACK).

## Trước Đợt 1

Migration `20261005210000_sync_local_usernames.sql`: đồng bộ username từ app_metadata
server-controlled sau INSERT/UPDATE Auth; backfill username NULL, giữ nguyên mật khẩu,
role và hồ sơ. Nếu tồn tại metadata trùng username, migration dừng để tránh chọn nhầm owner.

Migration `20261005200000_username_admin_directory.sql`: app_accounts.username unique,
must_change_password, password_reset_version; session gate, rate limits và RPC quản trị.
Xem [kích hoạt username/admin](../development/username-admin-setup.md).

Xem [thiết lập và cột dữ liệu](employee-directory-setup.md).
Migration `20261005120000_employee_directory.sql`: app_accounts, departments,
employees, audit_logs và allowlist quản trị trong schema app_private.

Migration `20261005160000_registration_profiles.sql` cho phép employee_code/job_title
NULL, thêm avatar_path và trigger hồ sơ cho Auth signup. Xem [đăng ký và Storage](registration-profile-setup.md).
