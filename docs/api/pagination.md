# Phân trang, lọc, sắp xếp

- Query: `?page=1&pageSize=20` — mặc định 20, tối đa 100.
- Response: `{ "data": [...], "meta": { "page": 1, "pageSize": 20, "total": 134 } }`
- Lọc: tham số camelCase (`?status=in_progress&assigneeId=<uuid>&dueFrom=2026-10-01`).
- Tìm kiếm: `?q=từ khoá`.
- Sắp xếp: `?sort=dueDate` tăng dần, `?sort=-dueDate` giảm dần; chỉ cho phép trường đã khai báo.
- Ngoại lệ: Board Kanban trả toàn bộ task đang mở của board (không phân trang), cột "Đã hoàn thành" giới hạn N task gần nhất + "xem thêm".
