# API Phòng ban — `/api/departments`

Module `apps/api/src/modules/departments`. Mọi endpoint yêu cầu đăng nhập.
Ghi dữ liệu đi qua RPC trong `supabase/migrations/20261006090200_department_management_rpcs.sql`
(một giao dịch, audit ghi đúng người thao tác). Đọc từ view `active_departments` / `active_employees`
(chỉ bản ghi chưa xoá). Quyền kiểm tra 3 lớp: `requireRole` ở route, service, và RPC.

| Method | Endpoint                       | Quyền           | Mô tả                                              |
| ------ | ------------------------------ | --------------- | -------------------------------------------------- |
| GET    | `/api/departments`             | Mọi người       | Danh sách; `status=deleted` chỉ Super Admin        |
| GET    | `/api/departments/:id`         | Mọi người       | Chi tiết + thành viên (tên, chức vụ, ảnh)          |
| POST   | `/api/departments`             | Super Admin, HR | Tạo phòng ban (BR-08), không tạo Dashboard (BR-02) |
| PATCH  | `/api/departments/:id`         | Super Admin, HR | Đổi tên, đổi / bỏ trưởng phòng                     |
| POST   | `/api/departments/:id/members` | Super Admin, HR | [Thêm thành viên] và [Chuyển phòng]                |
| DELETE | `/api/departments/:id`         | Super Admin     | Xoá mềm, chuyển toàn bộ nhân viên (BR-09)          |
| POST   | `/api/departments/:id/restore` | Super Admin     | Khôi phục phòng đã xoá                             |

## GET `/api/departments`

Query: `status=active|deleted` (mặc định `active`), `q` (tìm theo tên), `withoutDashboard=true` (chỉ phòng
chưa có Dashboard — modal Tạo Dashboard, ghi chú ở Workspace), `page`, `pageSize` (≤ 100).

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Kinh doanh",
      "manager": { "id": "uuid", "fullName": "Nguyễn Minh Anh" },
      "memberCount": 3,
      "archivedAt": null,
      "dashboardId": "uuid"
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 4 }
}
```

`manager: null` = "Chưa có trưởng phòng". Với `status=deleted`: `manager` null, `memberCount` 0, có `archivedAt`.
`dashboardId`: Dashboard chính của phòng (BR-04), `null` = chưa có. GET `/:id` cũng trả trường này.

## GET `/api/departments/:id`

Như một phần tử ở trên, thêm `members: [{ id, fullName, jobTitle, avatarUrl, isManager }]`
(tối đa 500, sắp theo tên). `avatarUrl` là signed URL 5 phút. Phòng đã xoá → `404 DEPARTMENT_NOT_FOUND`.

## POST `/api/departments`

```json
{ "name": "Pháp chế", "managerId": "uuid | null" }
```

Trả `201 { data: <chi tiết phòng ban> }`. Trưởng phòng đang ở phòng khác được chuyển sang phòng mới;
người đang là trưởng một phòng khác → `409 EMPLOYEE_IS_MANAGER`.

## PATCH `/api/departments/:id`

`{ "name"?: string, "managerId"?: "uuid | null" }` — có ít nhất một trường. Bỏ qua `managerId` = giữ nguyên;
`null` = bỏ trưởng phòng. Trưởng phòng cũ vẫn là thành viên phòng.

## POST `/api/departments/:id/members`

```json
{ "employeeId": "uuid", "replacementManagerId": "uuid | null" }
```

Đưa nhân viên vào phòng `:id` (thêm thành viên hoặc chuyển phòng). Nếu người này đang là trưởng phòng cũ,
phòng cũ thành "Chưa có trưởng phòng", hoặc nhận `replacementManagerId` nếu có. Ghi audit (BR-22).

## DELETE `/api/departments/:id`

```json
{ "receivingDepartmentId": "uuid | null" }
```

Phòng còn nhân viên thì bắt buộc có phòng nhận; toàn bộ nhân viên (kể cả trưởng phòng, thành nhân viên
thường) được chuyển trong cùng giao dịch. Trả `{ data: { movedEmployees: 3 } }`. Ghi audit
`department.delete` gồm phòng nhận và số người đã chuyển. Tên phòng đã xoá được dùng lại cho phòng mới.

## POST `/api/departments/:id/restore`

Khôi phục không kèm trưởng phòng và thành viên. Tên đã bị phòng khác dùng → `409 DEPARTMENT_NAME_EXISTS`.
Ghi audit `department.restore`.

## Mã lỗi riêng

| HTTP | code                            | Khi nào                                                     |
| ---- | ------------------------------- | ----------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`              | Input sai schema (`details` theo trường)                    |
| 403  | `FORBIDDEN`                     | Không đủ quyền (kể cả HR gọi xoá / xem "Đã xoá")            |
| 404  | `DEPARTMENT_NOT_FOUND`          | Không có hoặc đã xoá                                        |
| 404  | `EMPLOYEE_NOT_FOUND`            | Nhân viên không có hoặc đã xoá                              |
| 409  | `DEPARTMENT_NAME_EXISTS`        | Trùng tên phòng đang hoạt động (không phân biệt hoa thường) |
| 409  | `EMPLOYEE_IS_MANAGER`           | Người được chọn đang là trưởng một phòng khác               |
| 422  | `INVALID_REPLACEMENT_MANAGER`   | Trưởng phòng thay thế trùng chính người được chuyển         |
| 422  | `RECEIVING_DEPARTMENT_REQUIRED` | Xoá phòng còn nhân viên mà không chọn phòng nhận            |
| 422  | `RECEIVING_DEPARTMENT_INVALID`  | Phòng nhận trùng phòng bị xoá, không tồn tại hoặc đã xoá    |
