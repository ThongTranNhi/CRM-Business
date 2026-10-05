# Migration

- `20261005210000_sync_local_usernames.sql`: sửa username map khi Auth Admin ghi
  app_metadata sau INSERT, backfill account cũ và RPC kiểm tra username đã tồn tại.
  Chưa áp dụng lên Supabase trong phiên này.

- `20261005200000_username_admin_directory.sql`: username và đăng ký không SMTP,
  phiên đăng nhập có thể thu hồi, bắt buộc đổi mật khẩu tạm, rate limit bền vững,
  RPC quản trị hồ sơ và reset có audit. Source mới; chưa triển khai lên Supabase.

- `20261005160000_registration_profiles.sql`: mã nhân viên/chức vụ nullable,
  avatar_path, trigger tạo hồ sơ employee khi signup, backfill giữ quyền cũ,
  private Storage bucket/policy và RPC cập nhật hồ sơ có audit actor. Chưa triển khai.

- `20261005120000_employee_directory.sql`: hồ sơ tối giản, mã nhân viên unique,
  phòng ban với một trưởng phòng cùng phòng, 5 vai trò hệ thống, trạng thái tài khoản,
  audit bất biến, RLS mặc định từ chối và cấp super_admin cho hai Google identity
  được allowlist. Đã viết source; chưa chạy trên database.
