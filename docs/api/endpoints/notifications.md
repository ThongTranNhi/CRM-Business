# API Thông báo — `/api/notifications`

Module `apps/api/src/modules/notifications` (Đợt 3 S3, frontend-spec 3.2 và 4.21). Mọi role; mỗi người chỉ đọc và
đánh dấu thông báo **của chính mình** — người nhận lấy từ phiên đăng nhập, không nhận qua request. Đọc view
`notification_feed`, ghi qua RPC (migration `20261013090000_notifications.sql`).

| Method | Endpoint                  | Mô tả                                                 |
| ------ | ------------------------- | ----------------------------------------------------- |
| GET    | `/api/notifications`      | Thông báo mới nhất trước, phân trang, kèm số chưa đọc |
| POST   | `/api/notifications/read` | Đánh dấu đã đọc (một số hoặc tất cả)                  |

## Khi nào có thông báo

| `type`                    | Khi nào                                                                                | Người thao tác |
| ------------------------- | -------------------------------------------------------------------------------------- | -------------- |
| `task_assigned`           | Được giao việc: tạo task, đổi người phụ trách, nhận bàn giao khi xoá nhân viên (BR-53) | Có             |
| `task_collaborator_added` | Được thêm làm người phối hợp                                                           | Có             |
| `comment_mention`         | Được @nhắc trong bình luận / trả lời (chỉ người thuộc board của task)                  | Có             |
| `task_due_soon`           | Việc chưa xong, hạn là ngày mai — Cron Trigger 08:00 giờ Việt Nam                      | Không          |
| `task_overdue`            | Việc chưa xong, hạn trong 3 ngày qua (gửi một lần cho mỗi hạn) — cùng Cron Trigger     | Không          |

Không thông báo cho chính người thao tác. Người nhận: tài khoản còn hoạt động của nhân viên chưa nghỉ. Sắp đến hạn /
quá hạn gửi người phụ trách và người phối hợp còn thuộc board; chạy lại trong ngày không tạo trùng (đổi hạn thì được
nhắc lại).

## GET `/api/notifications`

Query: `unread` (`true` = chỉ chưa đọc), `page`, `pageSize` (mặc định 20; chuông dùng 10).

```json
{
  "data": [
    {
      "id": "uuid",
      "type": "comment_mention",
      "createdAt": "2026-10-11T01:00:00Z",
      "readAt": null,
      "task": { "id": "uuid", "title": "Gọi khách", "dueDate": "2026-10-12", "isArchived": false },
      "dashboardId": "uuid",
      "actor": { "fullName": "Nguyễn An" },
      "commentExcerpt": "@Trần Bình xem giúp…"
    }
  ],
  "meta": { "page": 1, "pageSize": 10, "total": 12, "unreadCount": 3 }
}
```

`actor`: null với thông báo hệ thống. `commentExcerpt`: 160 ký tự đầu của bình luận (chỉ `comment_mention`).
Giao diện mở task bằng `/app/workspace/:dashboardId?task=:id` và ghép câu tiếng Việt theo `type`.

## POST `/api/notifications/read`

Body `{ "ids": ["uuid"] }` (1 → 100) hoặc `{}` = tất cả thông báo chưa đọc. Chỉ đổi thông báo của người gọi (id
của người khác bị bỏ qua). Trả `{ "data": { "updated": 3 } }`.

## Cron Trigger

`apps/api/wrangler.toml` `[triggers] crons = ["0 1 * * *"]` (01:00 UTC = 08:00 giờ Việt Nam) → `scheduled` ở
`apps/api/src/index.ts` gọi RPC `crm_generate_due_notifications` (trả `{ dueSoon, overdue }`). Lỗi được Cloudflare
ghi vào log của lần chạy; lần sau vẫn gửi bù việc quá hạn trong 3 ngày.
