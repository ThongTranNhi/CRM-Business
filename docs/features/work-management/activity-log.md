# Lịch sử hoạt động (Activity log)

Bảng `task_activities` — **chỉ INSERT**, không UPDATE/DELETE (BR-21).

| Cột                               | Ghi chú               |
| --------------------------------- | --------------------- |
| id, task_id, actor_id, created_at |                       |
| action                            | xem danh sách dưới    |
| from_value, to_value              | jsonb, giá trị cũ/mới |

## Hành động ghi lại

`created`, `assigned`, `assignee_changed`, `collaborators_changed`, `due_date_changed`, `priority_changed`, `checklist_changed`, `attachment_added`, `attachment_removed`, `moved`, `completed`, `reopened`, `archived`, `restored` (hoàn tác xoá), `title_changed`.
Bình luận không ghi vào activity (đã có bảng riêng).

## Hiển thị (mục Lịch sử hoạt động trong chi tiết task)

```
17:00 — Nguyễn Văn An chuyển: Việc đang làm → Đã hoàn thành
10:30 — Nguyễn Văn An chuyển: Việc cần làm → Việc đang làm
09:15 — Giao cho Nguyễn Văn An
09:00 — Trần Thị B tạo công việc
```

Mới nhất ở trên, tải theo trang.

## Quy tắc

- Ghi trong cùng giao dịch với thay đổi (service hoặc Postgres function).
- Tên người hiển thị lấy theo `actor_id` khi đọc, không lưu tên.
- Archive task không xoá activity.
