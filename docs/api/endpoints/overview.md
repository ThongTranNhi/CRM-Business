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
