# Hồ sơ cá nhân và quản trị nhân viên

## Quản trị nhân viên — chỉ super_admin

GET `/api/users/employees?status=active|locked|deleted&q=&page=&pageSize=`: mặc định 25 bản ghi/trang,
`meta: { page, pageSize, total }`. `active` (Đang làm) và `locked` (Đã khoá) đọc view `active_employees`;
`deleted` (Đã xoá, BR-53) đọc view `employee_directory`. `q` tìm theo họ tên, mã nhân viên, username.
GET `/api/users/employees/department-options`: phòng ban chưa xoá (view `active_departments`, tối đa 100).
GET `/api/users/employees/:id`: hồ sơ chi tiết (kể cả người đã xoá), signed avatar URL, `archivedAt`,
`managedDepartment: { id, name } | null` (phòng mà người này đang làm trưởng phòng), `openTaskCount` (số việc
chưa xong, chưa lưu trữ người này đang phụ trách trên Dashboard **còn ghi được** — không tính phòng đã xoá,
BR-06; view `open_assigned_tasks` — hộp xoá nhân viên hiện "đang phụ trách N việc chưa xong"),
`ownedProjectCount` (số dự án chưa lưu trữ, phòng chưa xoá người này đang làm chủ — view `owned_writable_projects`).
PATCH, khôi phục, đặt lại mật khẩu không đếm việc.
PATCH `/api/users/employees/:id`: fullName, jobTitle, departmentId, status (active/disabled).
Đổi phòng của một trưởng phòng → phòng cũ thành "Chưa có trưởng phòng"; phòng mới phải chưa bị xoá.
POST `/api/users/employees/:id/reset-password`: `{password}` 12–128 ký tự; tài khoản
username active, không super_admin. Phải đổi mật khẩu, phiên cũ bị thu hồi (BR-54).

DELETE `/api/users/employees/:id` `{ "newManagerId": "uuid | null", "handoverEmployeeId": "uuid | null" }` —
xoá mềm (BR-53): khoá tài khoản, xoá mọi `auth.sessions`, ẩn khỏi danh sách và ô chọn người. Nếu là trưởng
phòng → phòng thành "Chưa có trưởng phòng" hoặc nhận `newManagerId`. Có `handoverEmployeeId` → mọi việc
đang mở trên Dashboard còn ghi được chuyển (việc ở Dashboard chỉ đọc giữ nguyên) cho người đó trong cùng giao dịch (activity `assignee_changed`; người nhận đang phối hợp thì gỡ
khỏi phối hợp); người nhận phải thuộc phòng / được mời vào board của **từng** việc, sai một việc → không bàn giao
việc nào và không xoá (`422 HANDOVER_EMPLOYEE_NOT_IN_BOARD`, câu báo nêu tối đa 3 việc kèm Dashboard,
`details.blockedTasks: [{ taskId, title, dashboardName }]`). Cùng người nhận cũng nhận quyền **chủ dự án** của
mọi dự án còn ghi được người bị xoá đang làm chủ (activity dự án `updated` kèm `ownerId`; người nhận đang là
thành viên thì rời danh sách thành viên); người nhận phải hợp lệ với phòng của **từng** dự án (Q6), sai một dự án
→ không bàn giao gì và không xoá (`422 HANDOVER_EMPLOYEE_NOT_PROJECT_ELIGIBLE`, câu báo nêu tối đa 3 dự án kèm
phòng, `details.blockedProjects: [{ projectId, name, departmentName }]`). Bỏ qua → việc và dự án giữ nguyên,
hiện "Đã nghỉ".
Trả `{ deleted: true, openTaskCount, handedOverTaskCount, ownedProjectCount, handedOverProjectCount }` — các
số do RPC đếm trong giao dịch (migration 20261012090000). Lỗi khác: `422 CANNOT_DELETE_SELF`,
`422 CANNOT_DELETE_ADMIN`, `422 INVALID_HANDOVER_EMPLOYEE` (người nhận là chính người bị xoá),
`422 HANDOVER_EMPLOYEE_NOT_FOUND` (người nhận đã nghỉ). Audit `employee.delete` (gồm `handoverEmployeeId`,
`handedOverTaskCount`, `ownedProjectCount`, `handedOverProjectCount`).
POST `/api/users/employees/:id/restore` — trả tài khoản về trạng thái trước khi xoá (đã khoá thì vẫn khoá;
xoá trước migration 20261006090400 thì `active`), không gán lại chức trưởng phòng;
phòng cũ đã xoá thì để trống. Mã nhân viên đã bị người khác dùng → `409 EMPLOYEE_CODE_EXISTS`
"Mã nhân viên đã được dùng, hãy đổi mã trước khi khôi phục". Audit `employee.restore`.
Người dùng được khôi phục phải đăng nhập lại.
Quyền kiểm tra cả middleware lẫn service; RPC kiểm tra actor role lần nữa.

## Ô chọn nhân viên — super_admin, hr_admin

GET `/api/users/employees/options?q=&departmentId=`: tối đa 20 người **chưa bị xoá** (view `active_employees`),
`[{ id, fullName, jobTitle, departmentId, departmentName, role }]` (`role` null nếu chưa có tài khoản). Dùng cho
chọn trưởng phòng (cảnh báo khi người được chọn chưa có role `department_manager`), thêm thành viên, người nhận
bàn giao (`departmentId` = phòng của người bị xoá, mặc định bật).

## Hồ sơ của tôi

GET `/api/users/me/profile`: JWT hợp lệ, tài khoản active. Chỉ trả hồ sơ của JWT subject:
id, fullName, employeeCode, jobTitle, departmentName, managerName, avatarPath, avatarUrl.
avatarUrl là signed URL 300 giây. Không nhận ID người khác làm input.

PATCH cùng URL: `{ employeeCode: string | null, avatarPath?: string | null }`.
Mã nhân viên trim, tối đa 50 ký tự, không trùng với người đang làm (không phân biệt hoa thường).
avatarPath phải thuộc thư mục UUID của người đang đăng nhập và có object tồn tại.
Không nhận fullName, role, departmentId, jobTitle hoặc accountId: input strict.
Audit được ghi cùng giao dịch bằng RPC update_own_profile chỉ service_role gọi được.
409 EMPLOYEE_CODE_EXISTS khi trùng mã; 403 khi khóa tài khoản hoặc sai owner;
400 VALIDATION_ERROR; 503 DATABASE_UNAVAILABLE khi database/storage chưa sẵn sàng.

Auth middleware kiểm tra trạng thái tài khoản mỗi request; role JWT phải khớp role DB,
nếu lệch trả 401 và yêu cầu đăng nhập lại. Không có API cấp quyền trong thay đổi này.
