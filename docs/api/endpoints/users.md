# Hồ sơ cá nhân

## Quản trị nhân viên — chỉ super_admin

GET `/api/users/employees?page=1`: 25 bản ghi/trang, meta.page/pageSize/hasMore.
GET `/api/users/employees/department-options`: danh sách phòng active (tối đa 100).
GET `/api/users/employees/:id`: hồ sơ chi tiết, signed avatar URL.
PATCH `/api/users/employees/:id`: fullName, jobTitle, departmentId, status (active/disabled).
POST `/api/users/employees/:id/reset-password`: `{password}` 12–128 ký tự; tài khoản
username active, không super_admin. Phải đổi mật khẩu, phiên cũ bị thu hồi.
Quyền kiểm tra cả middleware lẫn service; RPC kiểm tra actor role lần nữa.

GET `/api/users/me/profile`: JWT hợp lệ, tài khoản active. Chỉ trả hồ sơ của JWT subject:
id, fullName, employeeCode, jobTitle, departmentName, managerName, avatarPath, avatarUrl.
avatarUrl là signed URL 300 giây. Không nhận ID người khác làm input.

PATCH cùng URL: `{ employeeCode: string | null, avatarPath?: string | null }`.
Mã nhân viên trim, tối đa 50 ký tự, unique không phân biệt hoa thường.
avatarPath phải thuộc thư mục UUID của người đang đăng nhập và có object tồn tại.
Không nhận fullName, role, departmentId, jobTitle hoặc accountId: input strict.
Audit được ghi cùng giao dịch bằng RPC update_own_profile chỉ service_role gọi được.
409 EMPLOYEE_CODE_EXISTS khi trùng mã; 403 khi khóa tài khoản hoặc sai owner;
400 INVALID_INPUT; 503 DATABASE_UNAVAILABLE khi database/storage chưa sẵn sàng.

Auth middleware kiểm tra trạng thái tài khoản mỗi request; role JWT phải khớp role DB,
nếu lệch trả 401 và yêu cầu đăng nhập lại. Không có API cấp quyền trong thay đổi này.
