# Mô hình phân quyền

## Hai tầng kiểm tra (đều ở backend)

1. **Theo role** — `requireRole('super_admin','hr_admin')` trong `permission.middleware` chặn sớm.
2. **Theo dữ liệu** — trong service: người gọi có phải manager của phòng này? có là thành viên board này?

Mặc định **từ chối** khi không khớp quy tắc nào.

## Ma trận quyền mặc định

✅ toàn bộ · 🏢 phòng ban mình · 👤 của bản thân · — không có

| Hành động                                           | Super Admin                           | HR Admin      | Dept Manager         | Team Leader | Employee                          |
| --------------------------------------------------- | ------------------------------------- | ------------- | -------------------- | ----------- | --------------------------------- |
| Xem Workspace                                       | ✅                                    | ✅ (xem)      | 🏢                   | 🏢          | 🏢 / được mời                     |
| Tạo Dashboard                                       | ✅                                    | —             | 🏢                   | —           | —                                 |
| Sửa/archive Dashboard                               | ✅                                    | —             | 🏢                   | —           | —                                 |
| Tạo phòng ban (kể cả trong hộp thoại Tạo Dashboard) | ✅                                    | ✅            | — _(chờ xác nhận)_   | —           | —                                 |
| Tạo task trong Dashboard                            | ✅                                    | —             | 🏢                   | 🏢          | 🏢 (nếu là thành viên)            |
| Sửa task                                            | ✅                                    | —             | 🏢                   | 🏢          | 👤 người phụ trách / phối hợp     |
| Đổi người phụ trách                                 | ✅                                    | —             | 🏢                   | 🏢          | 👤 người tạo task                 |
| Kéo thả task                                        | ✅                                    | —             | 🏢                   | 🏢          | 👤 task mình phụ trách / phối hợp |
| Xoá (archive) task                                  | ✅                                    | —             | 🏢                   | —           | 👤 người tạo                      |
| Xem dự án                                           | ✅                                    | ✅ (xem)      | 🏢                   | 🏢          | 🏢 / dự án mình tham gia          |
| Tạo / lưu trữ / khôi phục dự án                     | ✅                                    | —             | 🏢                   | —           | —                                 |
| Sửa dự án, đặt thành viên dự án                     | ✅                                    | —             | 🏢                   | —           | 👤 chủ dự án                      |
| Quản lý phòng ban                                   | ✅                                    | ✅            | —                    | —           | —                                 |
| Xoá / khôi phục phòng ban (BR-09)                   | ✅                                    | —             | —                    | —           | —                                 |
| Xem hồ sơ nhân viên                                 | ✅                                    | ✅            | 🏢 (không nhạy cảm)  | 🏢 (cơ bản) | 👤                                |
| Sửa hồ sơ nhân viên                                 | ✅                                    | ✅            | —                    | —           | 👤 (trường cho phép)              |
| Xoá / khôi phục nhân viên (BR-53)                   | ✅ (trừ chính mình, Super Admin khác) | —             | —                    | —           | —                                 |
| Đặt lại mật khẩu (BR-54)                            | ✅ (trừ Super Admin)                  | —             | —                    | —           | —                                 |
| Xem/sửa lương                                       | ✅                                    | ✅            | —                    | —           | 👤 xem phiếu lương                |
| Duyệt nghỉ phép                                     | ✅                                    | ✅ (cấp cuối) | 🏢 (cấp 1)           | —           | —                                 |
| Executive Overview                                  | ✅                                    | —             | 🏢 (phần phòng mình) | —           | —                                 |
| Workload                                            | ✅                                    | —             | 🏢                   | 🏢          | —                                 |
| Roles & Permissions                                 | ✅                                    | —             | —                    | —           | —                                 |
| Audit log                                           | ✅                                    | ✅ (phần HR)  | —                    | —           | —                                 |

> Ma trận này là mặc định khi seed. Sau này lưu ở bảng `roles` / `permissions` / `role_permissions` để Super Admin cấu hình.

## Dữ liệu cần cho kiểm tra

- `app_metadata.role` trong JWT (khớp `app_accounts.role`).
- Thành viên phòng = `employees.department_id`. **Trưởng phòng** của phòng X = role `department_manager`
  **và** là `departments.manager_employee_id` của X (cả hai điều kiện). `/api/auth/me` trả `managedDepartmentId`.
- `board_members(board_id, employee_id)` cho người ngoài phòng được mời vào Dashboard.
- Work Management: RPC `crm_work_access` trả các dữ kiện trên cho một board / task; quyền tính bằng hàm thuần
  `apps/api/src/lib/work-access.ts` (có test). HR Admin xem mọi Dashboard nhưng chỉ đọc, trừ khi là thành viên
  board. Phòng ban đã xoá → Dashboard chỉ đọc với mọi người (BR-06).
- HR Admin cũng là nhân viên của phòng mình (thường là phòng Nhân sự): trên Dashboard phòng đó, HR Admin ghi
  được như một thành viên bình thường (tạo task, bình luận, sửa / kéo task mình phụ trách hoặc phối hợp, lưu
  trữ task mình tạo); với Dashboard phòng khác chỉ đọc.
- Đổi người phụ trách (`assigneeId`): Super Admin, Trưởng phòng, Trưởng nhóm của phòng và **người tạo task**. Người
  phụ trách hiện tại sửa được các trường khác và người phối hợp nhưng không tự giao việc cho người khác.
- Dự án (Đợt 3 S1): quyền tính bằng hàm thuần `apps/api/src/lib/project-access.ts` (có test). Trưởng phòng = role
  `department_manager` **và** đang là trưởng phòng của phòng có dự án. Chủ dự án (kể cả nhân viên thường) sửa
  thông tin và thành viên dự án mình, không lưu trữ được. Người phòng khác được mời vào board và là thành viên dự
  án thì xem được dự án đó. Phòng ban đã xoá → dự án chỉ xem (`409 PROJECT_READ_ONLY`).
- Thao tác ghi trên Dashboard chỉ đọc (phòng đã xoá) trả `409 DASHBOARD_READ_ONLY` — kiểm tra trước quyền ghi (403).
