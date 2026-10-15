# API Tìm kiếm — `/api/search`

Module `apps/api/src/modules/search` (Đợt 3 S4, frontend-spec 3.2 — ô tìm kiếm ở Header). Mọi role. Không có bảng
hay migration riêng: mỗi nhóm gọi lại **service của module sở hữu**, nên cùng quy tắc quyền với trang danh sách
tương ứng.

## GET `/api/search?q=`

`q`: 2 → 100 ký tự (ít hơn 2 → `400 VALIDATION_ERROR`). Ký tự đặc biệt của bộ lọc PostgREST bị bỏ, `%` `_` được
hiểu là chữ thường (`searchSchema`). Tối đa **5** kết quả mỗi nhóm.

| Nhóm          | Nguồn (service)                                                  | Ai thấy gì                                                             |
| ------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `tasks`       | `department-dashboards.listVisibleBoards` + `tasks` (task_cards) | Task chưa lưu trữ trên board người xem thấy ở Workspace (BR-41, BR-06) |
| `employees`   | `users.getEmployeeDirectory`                                     | Chỉ Super Admin (`employees.view`); role khác luôn `[]`                |
| `projects`    | `projects.listProjects`                                          | Như trang Dự án: dự án chưa lưu trữ người xem được thấy                |
| `departments` | `departments.listDepartments`                                    | Phòng ban chưa xoá (mọi người)                                         |

```json
{
  "data": {
    "tasks": [
      {
        "id": "uuid",
        "title": "Gọi khách",
        "status": "todo",
        "dashboardId": "uuid",
        "dashboardName": "Kinh doanh"
      }
    ],
    "employees": [
      {
        "id": "uuid",
        "fullName": "Nguyễn An",
        "jobTitle": "Kế toán",
        "departmentName": "Tài chính"
      }
    ],
    "projects": [{ "id": "uuid", "name": "Ra mắt web", "departmentName": "Website" }],
    "departments": [{ "id": "uuid", "name": "Kinh doanh" }]
  }
}
```

Task: việc đang mở trước, rồi theo hạn. Giao diện mở task bằng `/app/workspace/:dashboardId?task=:id`, các nhóm khác
mở trang chi tiết tương ứng.
