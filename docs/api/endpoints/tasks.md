# API Board và Task — `/api/boards`, `/api/tasks`

Module `apps/api/src/modules/tasks`. Mọi endpoint yêu cầu đăng nhập. Ghi qua RPC trong
`supabase/migrations/20261006090700_work_management_rpcs.sql` (một giao dịch, ghi `task_activities` cùng lúc).
Đọc từ view `task_cards`, bảng `board_columns`, `tasks`. Quyền theo dữ liệu tính bằng
`apps/api/src/lib/work-access.ts` từ RPC `crm_work_access` (docs/architecture/permission-model.md).

| Method | Endpoint                       | Quyền                                                                       | Mô tả                                          |
| ------ | ------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------- |
| GET    | `/api/boards/:boardId`         | Xem board (thành viên phòng / board, Super Admin, HR Admin)                 | Cột + việc đang mở + việc xong gần nhất        |
| POST   | `/api/boards/:boardId/tasks`   | Ghi board (thành viên, Trưởng phòng, Super Admin; HR chỉ khi là thành viên) | Tạo việc (BR-11, BR-12)                        |
| GET    | `/api/tasks/:id`               | Xem board                                                                   | Chi tiết + quyền của người xem                 |
| PATCH  | `/api/tasks/:id`               | Sửa task                                                                    | Đổi tên, mô tả, người phụ trách, ưu tiên, ngày |
| PATCH  | `/api/tasks/:id/move`          | Sửa task                                                                    | Kéo thả (BR-13 → BR-15)                        |
| PUT    | `/api/tasks/:id/collaborators` | Sửa task                                                                    | Thay danh sách người phối hợp                  |
| DELETE | `/api/tasks/:id`               | Người tạo, Trưởng phòng, Super Admin                                        | Lưu trữ (BR-19), không xoá                     |

"Sửa task": Super Admin, Trưởng phòng (role `department_manager` và là trưởng phòng của phòng đó), Trưởng nhóm
trong phòng; nhân viên / thành viên board chỉ với task mình phụ trách hoặc phối hợp. Phòng đã xoá → mọi thao tác
ghi trả `409 DASHBOARD_READ_ONLY` (BR-06).

## GET `/api/boards/:boardId`

Query: `doneLimit` (20 → 200, mặc định 20) — số việc Đã hoàn thành gần nhất ([Xem thêm] tăng 20).

```json
{
  "data": {
    "boardId": "uuid",
    "columns": [{ "id": "uuid", "name": "VIỆC CẦN LÀM", "status": "todo", "position": 1 }],
    "tasks": [
      {
        "id": "uuid",
        "columnId": "uuid",
        "status": "todo",
        "title": "Gọi lại khách hàng",
        "position": 1024,
        "priority": "high",
        "dueDate": "2026-10-09",
        "completedAt": null,
        "assignee": { "id": "uuid", "fullName": "Nguyễn Văn An", "isArchived": false },
        "collaborators": [{ "id": "uuid", "fullName": "Trần Thị B" }],
        "checklist": { "done": 2, "total": 5 },
        "commentCount": 3,
        "canMove": true
      }
    ],
    "doneTotal": 42
  }
}
```

- Cột vẽ theo `columns` (sắp theo `position`); `status` là nhóm trạng thái của cột (BR-10).
- `tasks`: mọi việc chưa xong + `doneLimit` việc xong gần nhất; thứ tự trong cột theo `position`.
- `assignee.isArchived`: người phụ trách đã nghỉ (BR-53) → giao diện hiện "Đã nghỉ".
- `canMove`: người xem kéo / đổi cột được thẻ này không. Avatar lấy theo id từ `members` của
  `GET /api/department-dashboards/:id`.
- Quá hạn tính ở giao diện theo giờ Việt Nam (BR-16), không trả cờ.

## POST `/api/boards/:boardId/tasks`

```json
{
  "title": "Gọi lại khách hàng",
  "assigneeId": "uuid",
  "collaboratorIds": ["uuid"],
  "priority": "normal",
  "startDate": "2026-10-07",
  "dueDate": "2026-10-09",
  "description": null
}
```

Bắt buộc `title`, `assigneeId`; còn lại tuỳ chọn (`priority` mặc định `normal`). `department_id` lấy từ Dashboard,
client không gửi (BR-11). Task mới nằm đầu cột mặc định nhóm `todo`. Trả `201` một thẻ như trong GET board.

## PATCH `/api/tasks/:id`

Gửi ít nhất một trong: `title`, `description` (null = xoá), `assigneeId`, `priority`, `startDate`, `dueDate`
(null = xoá). Người phụ trách mới đang là người phối hợp → bị gỡ khỏi danh sách phối hợp (BR-12). Trả chi tiết task.

## PATCH `/api/tasks/:id/move`

Body `{ "toColumnId": "uuid", "previousTaskId": "uuid | null", "nextTaskId": "uuid | null" }` — xem
`docs/features/work-management/drag-and-drop.md`. Trả `{ id, columnId, status, position, startedAt, completedAt,
completedBy }`.

## PUT `/api/tasks/:id/collaborators`

Body `{ "employeeIds": ["uuid"] }` (tối đa 20). Chỉ người **mới thêm** phải thuộc phòng / board; người phối hợp cũ
đã chuyển phòng vẫn giữ hoặc gỡ được. Trả chi tiết task.

## GET `/api/tasks/:id`

Trả thông tin task, `department`, `assignee`, `collaborators`, `completedBy` / `createdBy` (`{ id, fullName }`), và
`permissions: { canEdit, canArchive, canComment }` của người xem.

## Lỗi

| Mã                                          | Khi nào                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `400 VALIDATION_ERROR`                      | Sai định dạng (zod), tên rỗng / quá dài                                |
| `400 ASSIGNEE_REQUIRED`                     | Thiếu người phụ trách chính                                            |
| `400 INVALID_DATE_RANGE`                    | Hạn trước ngày bắt đầu (check `tasks_date_range_check`)                |
| `400 INVALID_COLUMN`                        | Cột đích không thuộc board của task                                    |
| `403 FORBIDDEN`                             | Không đủ quyền (xem bảng trên)                                         |
| `404 BOARD_NOT_FOUND`, `404 TASK_NOT_FOUND` | Không tồn tại hoặc task đã lưu trữ                                     |
| `409 INVALID_POSITION`                      | Task lân cận đã đổi chỗ — giao diện tải lại board                      |
| `409 DASHBOARD_READ_ONLY`                   | Phòng ban đã xoá (BR-06)                                               |
| `422 EMPLOYEE_NOT_IN_BOARD`                 | Người được giao / phối hợp không thuộc phòng, không được mời vào board |
| `422 COLLABORATOR_IS_ASSIGNEE`              | Người phụ trách nằm trong danh sách phối hợp                           |
