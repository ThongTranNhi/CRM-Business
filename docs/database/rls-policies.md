# RLS hồ sơ nhân viên

Migration username_admin_directory: auth_rate_limits trong app_private, RLS + revoke
client grants. Các RPC session/rate/admin/password chỉ service_role có EXECUTE.
active_avatar_owner bổ sung kiểm tra auth.sessions và must_change_password.
Không thêm quyền đọc toàn bộ nhân viên cho authenticated: danh sách chỉ qua Hono API.

RLS bật trên app_accounts, departments, employees, audit_logs và super_admin_allowlist.
Không cấp policy cho anon/authenticated; thu hồi quyền trực tiếp của hai role này.
service_role chỉ được đọc/ghi qua API theo quyền bảng; bypass RLS nên quyền từng
người và trạng thái khóa phải được kiểm tra ở API. Không coi RLS là lớp bảo vệ
request dùng secret key.

Xem [giới hạn và việc cần nối API](employee-directory-setup.md).

Migration registration_profiles: policy profile_avatars_insert trên storage.objects
chỉ cho authenticated upload vào folder UUID bản thân nếu account/hồ sơ active.
Không thêm quyền đọc hoặc sửa bảng employees từ web. RPC update_own_profile chỉ
service_role có EXECUTE; API lấy auth user ID từ JWT đã xác minh.
