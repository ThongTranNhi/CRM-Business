# Database hồ sơ nhân viên

Migration `20261005210000_sync_local_usernames.sql`: đồng bộ username từ app_metadata
server-controlled sau INSERT/UPDATE Auth; backfill username NULL, giữ nguyên mật khẩu,
role và hồ sơ. Nếu tồn tại metadata trùng username, migration dừng để tránh chọn nhầm owner.

Migration `20261005200000_username_admin_directory.sql`: app_accounts.username unique,
must_change_password, password_reset_version; session gate, rate limits và RPC quản trị.
Xem [kích hoạt username/admin](../development/username-admin-setup.md).

Xem [thiết lập và cột dữ liệu](employee-directory-setup.md).
Migration `20261005120000_employee_directory.sql`: app_accounts, departments,
employees, audit_logs và allowlist quản trị trong schema app_private.
Chưa triển khai lên Supabase; chỉ bao gồm hồ sơ tối giản đã chốt.

Migration `20261005160000_registration_profiles.sql` cho phép employee_code/job_title
NULL, thêm avatar_path và trigger hồ sơ cho Auth signup. Xem [đăng ký và Storage](registration-profile-setup.md).
