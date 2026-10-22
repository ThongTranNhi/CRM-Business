# API Tổng quan — `/api/overview`

Module `apps/api/src/modules/overview` (Đợt 4 S2, frontend-spec 4.2). Không có bảng riêng: ghép service của
`tasks` (việc của chính người gọi) và `department-dashboards` (tổng toàn công ty). Chỉ đọc, không audit.

## GET `/api/overview/me`

Mọi role. Người xem lấy từ phiên đăng nhập.

```json
{
  "data": {
    "counts": { "todo": 3, "inProgress": 1, "overdue": 1, "doneThisWeek": 2 },
    "dueSoon": [
      {
        "id": "uuid",
        "title": "Viết báo cáo",
        "status": "todo",
        "priority": "high",
        "dueDate": "2026-10-20",
        "role": "assignee",
        "dashboard": { "id": "uuid", "name": "Website" },
        "...": "cùng dạng một dòng GET /api/tasks/mine"
      }
    ],
    "company": { "open": 42, "overdue": 5 }
  }
}
```

| Trường    | Nguồn / quy tắc                                                                                                                                                    |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `counts`  | RPC `crm_my_task_counts` không lọc — việc phụ trách **và** phối hợp, như Việc của tôi. `doneThisWeek`: xong từ 00:00 Thứ Hai (giờ Việt Nam)                        |
| `dueSoon` | View `my_task_rows`, cờ `is_due_soon`: chưa xong, hạn từ hôm nay tới 6 ngày sau (7 ngày). Tối đa 8, hạn gần nhất trước. Không gồm việc quá hạn (đã có thẻ Quá hạn) |
| `company` | **Chỉ Super Admin** (role khác `null`): tổng `open` / `overdue` của mọi Dashboard thuộc phòng chưa xoá — cùng số liệu thẻ Workspace                                |

Tài khoản không có hồ sơ nhân viên (vd. CEO / Master) → `counts` bằng 0, `dueSoon` rỗng; Super Admin vẫn có
`company`. Thông báo mới trên trang đọc từ `GET /api/notifications` (chung cache với chuông Header). Khối Chấm công,
Tạo đơn nghỉ, Chờ tôi duyệt, Đơn của tôi thêm ở Đợt 5.

Link của 4 thẻ (số trên thẻ = số trên tab vì cùng bộ lọc ở API):

| Thẻ           | Đến                                         |
| ------------- | ------------------------------------------- |
| Cần làm       | `/app/my-tasks?tab=open&status=todo`        |
| Đang làm      | `/app/my-tasks?tab=open&status=in_progress` |
| Quá hạn       | `/app/my-tasks?tab=overdue`                 |
| Xong tuần này | `/app/my-tasks?tab=done&status=done_week`   |

## GET `/api/overview/executive?period=week|month|quarter`

Tổng quan điều hành (`/app/overview`, frontend-spec 4.7, chủ dự án chốt 22/10/2026). Chỉ **Super Admin** (mọi phòng)
và **Trưởng phòng** (phòng của chính họ, lấy từ phiên đăng nhập như Khối lượng việc); role khác `403`. `period` mặc
định `month`, giá trị khác → `400`. Trưởng phòng chưa thuộc phòng nào → số 0, danh sách rỗng.

```json
{
  "data": {
    "period": "month",
    "departmentId": null,
    "totals": { "total": 10, "todo": 4, "inProgress": 1, "done": 5, "overdue": 2 },
    "departments": [
      {
        "department": { "id": "uuid", "name": "Kinh doanh" },
        "dashboardId": "uuid",
        "todo": 3,
        "inProgress": 1,
        "done": 4,
        "overdue": 2
      }
    ],
    "projects": ["ProjectSummary như GET /api/projects"],
    "upcoming": [
      {
        "id": "uuid",
        "title": "Gửi báo giá",
        "status": "todo",
        "priority": "high",
        "dueDate": "2026-10-24",
        "daysLeft": 2,
        "department": { "id": "uuid", "name": "Kinh doanh" },
        "dashboardId": "uuid",
        "assignee": { "id": "uuid", "fullName": "An" }
      }
    ],
    "overloaded": ["WorkloadRow như GET /api/workload"]
  }
}
```

| Khối          | Nguồn và quy tắc                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `totals`      | Cộng `departments`. Chỉ việc **tạo trong kỳ** (từ Thứ Hai / ngày 1 tháng / ngày 1 quý, giờ Việt Nam); `total` = 3 nhóm |
| `departments` | RPC `crm_executive_task_stats` — phòng có ít nhất 1 việc tạo trong kỳ; quá hạn = chưa xong, hạn trước hôm nay          |
| `projects`    | `project_summaries`: dự án chưa xong, chưa lưu trữ, phòng chưa xoá; hạn gần nhất trước; tối đa 8. **Không theo kỳ**    |
| `upcoming`    | View `upcoming_task_rows`: việc chưa xong, hạn hôm nay → 6 ngày sau; tối đa 8. **Không theo kỳ**                       |
| `overloaded`  | `employee_workload`: có việc quá hạn hoặc > 10 việc đang mở; quá hạn nhiều nhất trước; tối đa 5. **Không theo kỳ**     |

Bỏ task đã lưu trữ và task của phòng đã xoá. Thẻ số trên giao diện bấm → `/app/workload` (Đợt 7 đổi sang Báo cáo).
Khối Nhân sự hôm nay thêm ở Đợt 5.
