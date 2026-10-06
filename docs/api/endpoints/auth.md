# API tài khoản

Đăng ký trả 409 `USERNAME_EXISTS`, message `Tên đăng nhập đã tồn tại` khi trùng,
kể cả collision đồng thời. Kiểm tra cả account map và Auth metadata local.
Chỉ trả 201 sau khi kiểm tra username đã liên kết đúng ID Auth vừa tạo;
503 USERNAME_SYNC_REQUIRED nếu chưa đồng bộ, tránh báo thành công sai.

POST `/api/auth/register`: public, `{username,password}` strict, employee role fixed,
rate-limit. Chỉ tạo tài khoản username; không tạo admin theo email/name người dùng.
POST `/api/auth/login`: public, cùng input; trả `{data:{access_token,refresh_token,...}}`, no-store.
GET `/api/auth/me`: JWT/session hợp lệ, trả id, role, status, username, mustChangePassword, resetVersion,
employeeId, fullName, departmentId, departmentName (từ view `active_employees`; null nếu chưa có hồ sơ),
adminTitle (nhãn Super Admin `CEO` / `Master` từ `app_private.super_admin_allowlist.title`; null với role khác).
Web dùng để hiện menu tài khoản và helper `can()` ẩn nút theo quyền.
POST `/api/auth/change-password`: JWT/session hợp lệ, `{username,currentPassword,password}`;
xác minh mật khẩu hiện tại, cập nhật qua Auth, kiểm tra version và thu hồi phiên khác.

Các lỗi trả thông báo an toàn, không trả password/token trong logs. AUTH_FAILED khi upstream
không chấp nhận input; UNAUTHENTICATED khi không có identity/session active;
RATE_LIMITED 429; PASSWORD_CHANGE_REQUIRED 403 cho các API khác khi còn mật khẩu tạm.
