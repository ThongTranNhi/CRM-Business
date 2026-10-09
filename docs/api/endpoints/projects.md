# API Dự án — `/api/projects`

Module `apps/api/src/modules/projects` (Đợt 3 S1, BR-30, BR-31). Mọi endpoint yêu cầu đăng nhập. Ghi qua RPC trong
`supabase/migrations/20261009090000_projects.sql` (ghi audit cùng giao dịch). Đọc view `project_summaries`,
`project_activity_feed`, `task_cards`. Quyền tính bằng `apps/api/src/lib/project-access.ts`
(docs/architecture/permission-model.md).

| Method | Endpoint                                       | Quyền                                                              | Mô tả                                     |
| ------ | ---------------------------------------------- | ------------------------------------------------------------------ | ----------------------------------------- |
| GET    | `/api/projects`                                | Super Admin, HR Admin: tất cả; người khác: phòng mình + tham gia   | Danh sách, phân trang                     |
| POST   | `/api/projects`                                | Super Admin; Trưởng phòng của phòng                                | Tạo dự án                                 |
| GET    | `/api/projects/eligible-members?departmentId=` | Như POST                                                           | Người chọn được làm chủ / thành viên (Q6) |
| GET    | `/api/projects/:id`                            | Xem dự án                                                          | Chi tiết + thành viên + quyền             |
| PATCH  | `/api/projects/:id`                            | Super Admin, Trưởng phòng, chủ dự án (đổi chủ: không có chủ dự án) | Sửa thông tin                             |
| DELETE | `/api/projects/:id`                            | Super Admin, Trưởng phòng                                          | Lưu trữ (không xoá)                       |
| POST   | `/api/projects/:id/restore`                    | Như DELETE                                                         | Khôi phục                                 |
| PUT    | `/api/projects/:id/members`                    | Như PATCH                                                          | Thay danh sách thành viên                 |
| GET    | `/api/projects/:id/eligible-members`           | Như PATCH                                                          | Người chọn được cho dự án này             |
| GET    | `/api/projects/:id/tasks`                      | Xem dự án                                                          | Task chưa lưu trữ của dự án, phân trang   |
| GET    | `/api/projects/:id/activities`                 | Xem dự án                                                          | Lịch sử dự án, phân trang                 |

"Xem dự án": Super Admin, HR Admin (chỉ đọc), người cùng phòng, thành viên dự án **còn** thuộc phòng dự án hoặc
còn là `board_members` của board phòng đó (chuyển phòng / bị bỏ khỏi board → `403`; chủ dự án cũng mất quyền sửa). "Trưởng phòng": role
`department_manager` và đang là trưởng phòng của phòng có dự án. Phòng ban đã xoá → mọi thao tác ghi trả
`409 PROJECT_READ_ONLY` (kiểm tra trước quyền). Dự án đã lưu trữ: xem được; sửa → `404 PROJECT_NOT_FOUND`.

## GET `/api/projects`

Query: `page`, `pageSize` (mặc định 20, tối đa 100), `q` (tên), `departmentId`, `status`
(`planning|active|on_hold|done|archived`; bỏ trống = mọi dự án chưa lưu trữ, `archived` = đã lưu trữ).

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Ra mắt web",
      "description": null,
      "status": "active",
      "startDate": "2026-10-01",
      "dueDate": "2026-10-30",
      "archivedAt": null,
      "createdAt": "2026-10-09T01:00:00Z",
      "department": { "id": "uuid", "name": "Website" },
      "departmentArchived": false,
      "dashboardId": "uuid",
      "boardId": "uuid",
      "owner": { "id": "uuid", "fullName": "Nguyễn Văn An" },
      "progress": { "total": 4, "done": 1, "overdue": 1, "percent": 25 },
      "memberCount": 3
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 }
}
```

`progress` (BR-31): task `done` / task chưa lưu trữ, làm tròn; chưa có task → `percent: null`. `overdue` theo ngày
Việt Nam (BR-16). `dashboardId`: Dashboard của phòng (mở task `?task=`, nút [Mở trên board] `?project=`); null nếu
phòng chưa có Dashboard. `boardId`: board của Dashboard đó (null theo `dashboardId`).

## POST `/api/projects`

```json
{
  "departmentId": "uuid",
  "name": "1 → 120 ký tự",
  "description": "≤ 2000 ký tự | null",
  "ownerEmployeeId": "uuid | null",
  "status": "planning",
  "startDate": "YYYY-MM-DD | null",
  "dueDate": "YYYY-MM-DD | null",
  "memberIds": ["uuid"]
}
```

Chủ dự án tự được thêm vào thành viên. Chủ / thành viên phải là nhân viên đang làm của phòng hoặc được mời vào board
của Dashboard phòng đó (Q6). Trả `201` + chi tiết.

## GET `/api/projects/:id`

Như một dòng danh sách, thêm `members: [{ id, fullName, jobTitle, avatarUrl, isArchived }]` và
`permissions: { canEdit, canManageMembers, canChangeOwner, canArchive }` của người xem (`canChangeOwner`: Super
Admin, Trưởng phòng của phòng).

## PATCH `/api/projects/:id`, PUT `/api/projects/:id/members`

PATCH: ít nhất một trong `name`, `description` (null = xoá), `ownerEmployeeId` (null = bỏ chủ), `status`,
`startDate`, `dueDate`. Không đổi phòng ban. Đổi `ownerEmployeeId` khác chủ hiện tại mà không có `canChangeOwner`
→ `403` (gửi lại đúng chủ hiện tại thì bỏ qua). Chủ mới tự vào thành viên và ghi lịch sử `project.members`. PUT: `{ "employeeIds": ["uuid"] }` (tối đa 50) — chỉ người **mới
thêm** phải đủ điều kiện Q6; chủ dự án luôn ở lại. Cả hai trả chi tiết.

## GET `/api/projects/:id/tasks`, `/api/projects/:id/activities`

`tasks`: `[{ id, title, status, priority, dueDate, completedAt, assignee: { id, fullName, isArchived } }]`, chỉ
task trên board của phòng dự án (phòng chưa có board → rỗng), việc đang mở trước. `activities`: `[{ id, action, createdAt, actor, from, to }]`, mới nhất trước; `action` ∈
`project.create`, `project.update`, `project.members`, `project.archive`, `project.restore`, `project.task_added`,
`project.task_removed`; `from` / `to` đã đổi id người thành tên (`owner`, `members`), task là `{ id, title }`.

## Task gắn dự án

`POST /api/boards/:boardId/tasks` và `PATCH /api/tasks/:id` nhận `projectId` (xem tasks.md). Thẻ và chi tiết task
trả `project: { id, name } | null`. `GET /api/department-dashboards/:id` trả `projects` cho ô chọn và bộ lọc.

## Lỗi

| Mã                                | Khi nào                                                      |
| --------------------------------- | ------------------------------------------------------------ |
| `400 VALIDATION_ERROR`            | Sai định dạng, tên rỗng / quá dài                            |
| `400 INVALID_DATE_RANGE`          | Hạn trước ngày bắt đầu                                       |
| `403 FORBIDDEN`                   | Không đủ quyền (bảng trên)                                   |
| `404 PROJECT_NOT_FOUND`           | Không tồn tại, hoặc sửa dự án đã lưu trữ                     |
| `409 PROJECT_NAME_EXISTS`         | Phòng đã có dự án cùng tên (cả khi khôi phục)                |
| `409 PROJECT_READ_ONLY`           | Phòng ban đã xoá                                             |
| `422 PROJECT_MEMBER_NOT_ELIGIBLE` | Chủ / thành viên không thuộc phòng, không được mời vào board |
| `422 PROJECT_NOT_IN_DEPARTMENT`   | Gắn task vào dự án phòng khác (RPC hoặc khoá ngoại ghép)     |
