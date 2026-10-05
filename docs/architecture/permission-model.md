# Mô hình phân quyền

## Hai tầng kiểm tra (đều ở backend)

1. **Theo role** — `requireRole('super_admin','hr_admin')` trong `permission.middleware` chặn sớm.
2. **Theo dữ liệu** — trong service: người gọi có phải manager của phòng này? có là thành viên board này?

Mặc định **từ chối** khi không khớp quy tắc nào.

## Ma trận quyền mặc định

✅ toàn bộ · 🏢 phòng ban mình · 👤 của bản thân · — không có

| Hành động                                           | Super Admin | HR Admin      | Dept Manager         | Team Leader | Employee                          |
| --------------------------------------------------- | ----------- | ------------- | -------------------- | ----------- | --------------------------------- |
| Xem Workspace                                       | ✅          | ✅ (xem)      | 🏢                   | 🏢          | 🏢 / được mời                     |
| Tạo Dashboard                                       | ✅          | —             | 🏢                   | —           | —                                 |
| Sửa/archive Dashboard                               | ✅          | —             | 🏢                   | —           | —                                 |
| Tạo phòng ban (kể cả trong hộp thoại Tạo Dashboard) | ✅          | ✅            | — _(chờ xác nhận)_   | —           | —                                 |
| Tạo task trong Dashboard                            | ✅          | —             | 🏢                   | 🏢          | 🏢 (nếu là thành viên)            |
| Sửa task                                            | ✅          | —             | 🏢                   | 🏢          | 👤 người phụ trách / phối hợp     |
| Kéo thả task                                        | ✅          | —             | 🏢                   | 🏢          | 👤 task mình phụ trách / phối hợp |
| Xoá (archive) task                                  | ✅          | —             | 🏢                   | —           | 👤 người tạo                      |
| Quản lý phòng ban                                   | ✅          | ✅            | —                    | —           | —                                 |
| Xem hồ sơ nhân viên                                 | ✅          | ✅            | 🏢 (không nhạy cảm)  | 🏢 (cơ bản) | 👤                                |
| Sửa hồ sơ nhân viên                                 | ✅          | ✅            | —                    | —           | 👤 (trường cho phép)              |
| Xem/sửa lương                                       | ✅          | ✅            | —                    | —           | 👤 xem phiếu lương                |
| Duyệt nghỉ phép                                     | ✅          | ✅ (cấp cuối) | 🏢 (cấp 1)           | —           | —                                 |
| Executive Overview                                  | ✅          | —             | 🏢 (phần phòng mình) | —           | —                                 |
| Workload                                            | ✅          | —             | 🏢                   | 🏢          | —                                 |
| Roles & Permissions                                 | ✅          | —             | —                    | —           | —                                 |
| Audit log                                           | ✅          | ✅ (phần HR)  | —                    | —           | —                                 |

> Ma trận này là mặc định khi seed. Sau này lưu ở bảng `roles` / `permissions` / `role_permissions` để Super Admin cấu hình.

## Dữ liệu cần cho kiểm tra

- `app_metadata.role` trong JWT.
- `department_members(user_id, department_id, member_role)` với `member_role ∈ {manager, leader, member}`.
- `board_members(board_id, user_id)` cho người ngoài phòng được mời vào Dashboard.
