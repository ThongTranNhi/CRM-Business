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

## Đợt 1 — phòng ban, xoá mềm (2026-10-06)

Không thêm policy cho `anon` / `authenticated`. Bảng và view mới đều thu hồi quyền của hai role này:

- `app_private.applied_migrations`: bật RLS, thu hồi cả `service_role`.
- View `active_departments`, `employee_directory`, `active_employees`: `security_invoker = true`
  (chạy theo quyền người gọi, không vượt RLS của bảng gốc); chỉ `service_role` được SELECT.
- RPC phòng ban / xoá nhân viên: chỉ `service_role` EXECUTE; hàm trợ giúp trong `app_private`
  không ai gọi trực tiếp được. Mỗi RPC tự kiểm tra role người thao tác qua `app_private.crm_actor`.

## Đợt 2 — Work Management (2026-10-06)

- Bật RLS trên 9 bảng mới, không policy cho `anon` / `authenticated` (mặc định từ chối).
- `service_role` chỉ được SELECT; riêng `task_comments` có thêm INSERT. Mọi thao tác ghi khác đi qua RPC
  `security definer` để activity được ghi cùng giao dịch.
- View đọc mới (`security_invoker = true`) chỉ `service_role` SELECT. RPC mới chỉ `service_role` EXECUTE;
  hàm trợ giúp trong `app_private` không ai gọi trực tiếp được.
