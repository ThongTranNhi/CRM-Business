# API Board và Task — `/api/boards`, `/api/tasks`

Module `apps/api/src/modules/tasks`. Mọi endpoint yêu cầu đăng nhập. Ghi qua RPC trong
`supabase/migrations/20261006090700_work_management_rpcs.sql` (một giao dịch, ghi `task_activities` cùng lúc).
Đọc từ view `task_cards`, bảng `board_columns`, `tasks`. Quyền theo dữ liệu tính bằng
`apps/api/src/lib/work-access.ts` từ RPC `crm_work_access` (docs/architecture/permission-model.md).

| Method | Endpoint                           | Quyền                                                                       | Mô tả                                                         |
| ------ | ---------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------- |
| GET    | `/api/boards/:boardId`             | Xem board (thành viên phòng / board, Super Admin, HR Admin)                 | Cột + việc đang mở + việc xong gần nhất                       |
| POST   | `/api/boards/:boardId/tasks`       | Ghi board (thành viên, Trưởng phòng, Super Admin; HR chỉ khi là thành viên) | Tạo việc (BR-11, BR-12)                                       |
| GET    | `/api/tasks/:id`                   | Xem board                                                                   | Chi tiết + quyền của người xem                                |
| PATCH  | `/api/tasks/:id`                   | Sửa task                                                                    | Đổi tên, mô tả, người phụ trách, ưu tiên, ngày                |
| PATCH  | `/api/tasks/:id/move`              | Sửa task                                                                    | Kéo thả (BR-13 → BR-15)                                       |
| PUT    | `/api/tasks/:id/collaborators`     | Sửa task                                                                    | Thay danh sách người phối hợp                                 |
| DELETE | `/api/tasks/:id`                   | Người tạo, Trưởng phòng, Super Admin                                        | Lưu trữ (BR-19), không xoá                                    |
| POST   | `/api/tasks/:id/restore`           | Như DELETE                                                                  | Hoàn tác xoá: task về cuối cột cũ (migration 20261007090000)  |
| GET    | `/api/boards/:boardId/trash`       | Ghi board; thấy việc mình khôi phục được                                    | Thùng rác: việc đã xoá, phân trang (migration 20261007100000) |
| GET    | `/api/tasks/:id/checklist`         | Xem board                                                                   | Mục checklist (BR-17), theo thứ tự                            |
| POST   | `/api/tasks/:id/checklist`         | Sửa task                                                                    | Thêm mục vào cuối; trả danh sách mới                          |
| PATCH  | `/api/tasks/:id/checklist/:itemId` | Sửa task                                                                    | Sửa nội dung / tick; trả danh sách mới                        |
| DELETE | `/api/tasks/:id/checklist/:itemId` | Sửa task                                                                    | Xoá mềm mục; trả danh sách mới                                |
| GET    | `/api/tasks/:id/comments`          | Xem board                                                                   | Bình luận gốc mới nhất trước + trả lời 1 cấp, phân trang      |
| POST   | `/api/tasks/:id/comments`          | Ghi board (`canComment`)                                                    | Bình luận / trả lời (`parentId`)                              |
| GET    | `/api/tasks/:id/activities`        | Xem board                                                                   | Lịch sử hoạt động mới nhất trước, phân trang                  |

"Sửa task": Super Admin, Trưởng phòng (role `department_manager` và là trưởng phòng của phòng đó), Trưởng nhóm
trong phòng; nhân viên / thành viên board chỉ với task mình phụ trách hoặc phối hợp. **Đổi người phụ trách**
(`assigneeId`): Super Admin, Trưởng phòng, Trưởng nhóm của phòng, người tạo task. Phòng đã xoá → mọi thao tác ghi
trả `409 DASHBOARD_READ_ONLY` (BR-06), kiểm tra **trước** quyền ghi (nên không ra 403).

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
        "canMove": true,
        "canArchive": false,
        "project": { "id": "uuid", "name": "Ra mắt web" }
      }
    ],
    "doneTotal": 42
  }
}
```

- Cột vẽ theo `columns` (sắp theo `position`); `status` là nhóm trạng thái của cột (BR-10).
- `tasks`: mọi việc chưa xong + `doneLimit` việc xong gần nhất; thứ tự trong cột theo `position`.
- `assignee.isArchived`: người phụ trách đã nghỉ (BR-53) → giao diện hiện "Đã nghỉ".
- `canMove`: người xem kéo / đổi cột được thẻ này không. `canArchive`: xoá (lưu trữ) được không — người tạo,
  Trưởng phòng, Super Admin (BR-19). Avatar lấy theo id từ `members` của
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

`projectId` (tuỳ chọn, Đợt 3): dự án chưa lưu trữ **cùng phòng** với Dashboard (BR-30) — sai →
`422 PROJECT_NOT_IN_DEPARTMENT`, dự án không còn → `404 PROJECT_NOT_FOUND`. Bắt buộc `title`, `assigneeId`; còn lại tuỳ chọn (`priority` mặc định `normal`). `department_id` lấy từ Dashboard,
client không gửi (BR-11). Task mới nằm đầu cột mặc định nhóm `todo`. Trả `201` một thẻ như trong GET board.

## PATCH `/api/tasks/:id`

Gửi ít nhất một trong: `title`, `description` (null = xoá), `assigneeId`, `priority`, `startDate`, `dueDate`
(null = xoá), `projectId` (null = bỏ khỏi dự án; đổi dự án ghi activity `project_changed`). Người phụ trách mới đang là người phối hợp → bị gỡ khỏi danh sách phối hợp (BR-12). Trả chi tiết task.

## PATCH `/api/tasks/:id/move`

Body `{ "toColumnId": "uuid", "previousTaskId": "uuid | null", "nextTaskId": "uuid | null" }` — xem
`docs/features/work-management/drag-and-drop.md`. Trả `{ id, columnId, status, position, startedAt, completedAt,
completedBy }`.

## PUT `/api/tasks/:id/collaborators`

Body `{ "employeeIds": ["uuid"] }` (tối đa 20). Chỉ người **mới thêm** phải thuộc phòng / board; người phối hợp cũ
đã chuyển phòng vẫn giữ hoặc gỡ được. Trả chi tiết task.

## GET `/api/tasks/:id`

Trả thông tin task, `department`, `assignee`, `collaborators`, `completedBy` / `createdBy` (`{ id, fullName }`), và
`permissions: { canEdit, canReassign, canArchive, canComment }` của người xem.

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

## DELETE `/api/tasks/:id` và POST `/api/tasks/:id/restore`

Xoá = lưu trữ (`archived_at`, BR-19), không xoá cứng; ghi activity `archived` + audit `task.archive`. Trả `204`.
Hoàn tác (toast [Hoàn tác] 5 giây): RPC `crm_restore_task` bỏ `archived_at`, đặt task về **cuối cột cũ**, ghi activity
`restored` + audit `task.restore`; trả thẻ như GET board. Cùng quyền với xoá. Task chưa lưu trữ → `404 TASK_NOT_FOUND`.

## GET `/api/boards/:boardId/trash`

Query: `page`, `pageSize` (mặc định 20, tối đa 100), `q` (tìm theo tên việc). Đọc view `task_trash`, mới xoá
trước. Không có xoá vĩnh viễn (BR-19).

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Gọi lại khách hàng",
      "columnName": "VIỆC CẦN LÀM",
      "archivedAt": "2026-10-07T08:00:00Z",
      "assignee": { "id": "uuid", "fullName": "Nguyễn Văn An" },
      "archivedBy": { "id": "uuid", "fullName": "Trần Thị B" }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 }
}
```

- Ai thấy gì = ai khôi phục được (`trashScope` trong `lib/work-access.ts`): Super Admin, Trưởng phòng — mọi việc
  đã xoá của board (`all`); người khác ghi được board — chỉ việc mình tạo (`own`).
- `columnName`: cột trước khi xoá — [Khôi phục] (`POST /api/tasks/:id/restore`) đưa task về cuối cột này.
- `archivedBy`: người xoá (activity `archived` mới nhất); `null` nếu không có.
- Lỗi: `403 FORBIDDEN` (không ghi được board, vd. HR Admin ngoài phòng), `404 BOARD_NOT_FOUND`,
  `409 DASHBOARD_READ_ONLY` (phòng đã xoá — BR-06).

## Drawer chi tiết task — checklist, bình luận, lịch sử

Module tách file: `tasks.checklist.*`, `tasks.comments.*`, `tasks.activities.*` (quyền dùng chung ở
`tasks.access.ts`). Task đã lưu trữ → `404 TASK_NOT_FOUND`; phòng đã xoá → ghi trả `409 DASHBOARD_READ_ONLY`.

### Checklist — `/api/tasks/:id/checklist[/:itemId]`

- GET trả `[{ "id", "content", "isDone", "position" }]` (mục chưa xoá, theo `position`).
- POST `{ "content": "1 → 500 ký tự" }` → `201` + danh sách mới. PATCH `{ "content"?, "isDone"? }` (ít nhất một).
  DELETE xoá mềm (`deleted_at`). Cả ba trả danh sách mới; RPC ghi activity `checklist_changed` (BR-20).
- Quyền ghi = sửa task (`canEdit`): Super Admin, Trưởng phòng, Trưởng nhóm, người phụ trách, người phối hợp.
- Lỗi: `404 CHECKLIST_ITEM_NOT_FOUND`, `400 VALIDATION_ERROR`.

### Bình luận — `/api/tasks/:id/comments`

GET `?page=&pageSize=` (mặc định 20): mỗi trang là **bình luận gốc** mới nhất trước, kèm mọi trả lời (cũ trước).
Giao diện đảo lại để mới nhất nằm dưới, "Xem bình luận cũ hơn" tải trang sau.

```json
{
  "data": [
    {
      "id": "uuid",
      "body": "Đã gửi bản nháp",
      "createdAt": "2026-10-08T08:17:00Z",
      "author": { "id": "account-uuid", "fullName": "Hi Hihi", "employeeId": "uuid | null" },
      "replies": [{ "id": "uuid", "body": "Ổn nhé", "createdAt": "…", "author": { "…": "…" } }]
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 }
}
```

POST `{ "body": "1 → 5000 ký tự", "parentId": "uuid | null" }` → `201 { "id" }`. Quyền: ghi được board
(`permissions.canComment`). Lỗi: `400 COMMENT_REPLY_TOO_DEEP` (trả lời vào một trả lời), `404 COMMENT_NOT_FOUND`.
Bình luận không ghi activity (activity-log.md). @mention: Đợt 3.

### Lịch sử — GET `/api/tasks/:id/activities`

`?page=&pageSize=` (mặc định 20), mới nhất trước. Mỗi dòng: `{ id, action, createdAt, actor: { id, fullName } | null,
from, to }`; `from` / `to` đã đổi id người thành tên: `title`, `assignee`, `collaborators`, `priority`, `dueDate`,
`columnName`, `checklistItem: { content, isDone? }`. Câu chữ tiếng Việt do giao diện ghép
(`apps/web/src/features/tasks/activity-text.ts`).
