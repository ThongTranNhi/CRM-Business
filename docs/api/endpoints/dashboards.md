# API Dashboard phòng ban — `/api/department-dashboards`

Module `apps/api/src/modules/department-dashboards`. Mọi endpoint yêu cầu đăng nhập.
Ghi qua RPC `crm_create_dashboard` (`supabase/migrations/20261006090700_work_management_rpcs.sql`): tạo
Dashboard, board và 3 cột mặc định trong một giao dịch. Đọc view `dashboard_summaries`, `active_employees`.
Quyền: `requireRole` ở route + service theo dữ liệu (`apps/api/src/lib/work-access.ts`, hàm thuần dựa trên
RPC `crm_work_access`), xem `docs/architecture/permission-model.md`.

| Method | Endpoint                         | Quyền                                              | Mô tả                                 |
| ------ | -------------------------------- | -------------------------------------------------- | ------------------------------------- |
| GET    | `/api/department-dashboards`     | Mọi người                                          | Dashboard người xem được thấy (BR-03) |
| GET    | `/api/department-dashboards/:id` | Thành viên phòng / board, Super Admin, HR Admin    | Header board + thành viên + quyền     |
| POST   | `/api/department-dashboards`     | Super Admin (mọi phòng), Trưởng phòng (phòng mình) | Tạo Dashboard (BR-04, BR-05)          |

## GET `/api/department-dashboards`

Super Admin, HR Admin thấy mọi Dashboard; người khác thấy Dashboard của phòng mình và board được mời vào
(BR-41). Dashboard của phòng đã xoá luôn ẩn (BR-06).

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Kinh doanh",
      "description": null,
      "department": { "id": "uuid", "name": "Kinh doanh" },
      "boardId": "uuid",
      "counts": { "open": 5, "inProgress": 2, "overdue": 1 },
      "manager": { "id": "uuid", "fullName": "Nguyễn Minh Anh" },
      "members": {
        "total": 6,
        "preview": [{ "id": "uuid", "fullName": "Nguyễn Minh Anh", "avatarUrl": null }]
      },
      "isReadOnly": false
    }
  ]
}
```

- `counts`: việc chưa xong / đang làm / quá hạn (theo ngày giờ Việt Nam, BR-16), không tính việc đã lưu trữ.
- `members.preview`: tối đa 4 người, trưởng phòng đứng đầu.
- `isReadOnly`: người xem không ghi được (vd. HR Admin không phải thành viên board) → giao diện hiện "Chỉ xem".

## GET `/api/department-dashboards/:id`

```json
{
  "data": {
    "id": "uuid",
    "name": "Kinh doanh",
    "description": null,
    "department": { "id": "uuid", "name": "Kinh doanh" },
    "departmentArchived": false,
    "boardId": "uuid",
    "manager": { "id": "uuid", "fullName": "Nguyễn Minh Anh" },
    "members": [
      {
        "id": "uuid",
        "fullName": "Nguyễn Minh Anh",
        "jobTitle": "Trưởng phòng",
        "avatarUrl": null,
        "isManager": true
      }
    ],
    "viewer": { "canView": true, "canWrite": true, "canEditAllTasks": true, "trashScope": "all" }
  }
}
```

- `members`: nhân viên đang làm của phòng + người được mời vào board (`board_members`); dùng cho ô chọn
  người phụ trách / phối hợp.
- `viewer.canWrite`: tạo task, bình luận. `viewer.canEditAllTasks`: sửa / kéo mọi task (Super Admin, Trưởng
  phòng, Trưởng nhóm của phòng). Phòng đã xoá → cả hai `false` (BR-06).
- `viewer.trashScope`: thùng rác board hiện gì — `all` (Super Admin, Trưởng phòng), `own` (việc mình tạo), `null`
  (không ghi được board → ẩn nút Thùng rác). Xem `GET /api/boards/:boardId/trash` trong tasks.md.
- Lỗi: `400 VALIDATION_ERROR` (id không phải UUID), `404 DASHBOARD_NOT_FOUND`, `403 FORBIDDEN`
  (không thuộc phòng / board).

## POST `/api/department-dashboards`

Body: `{ "departmentId": "uuid", "name"?: "≤ 120 ký tự", "description"?: "≤ 1000 ký tự" }`.
Tên bỏ trống → dùng tên phòng ban. Trả `201` với dữ liệu như GET `/:id`.

| Lỗi                            | Khi nào                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `409 DASHBOARD_ALREADY_EXISTS` | Phòng đã có Dashboard (BR-04); `error.details.dashboardId` để mở Dashboard đó                                       |
| `403 FORBIDDEN`                | Không phải Super Admin / Trưởng phòng của đúng phòng đó (Q1: role `department_manager` và là `manager_employee_id`) |
| `404 DEPARTMENT_NOT_FOUND`     | Phòng không tồn tại hoặc đã xoá                                                                                     |
| `400 VALIDATION_ERROR`         | Sai định dạng                                                                                                       |
