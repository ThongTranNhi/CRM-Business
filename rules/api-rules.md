# Quy tắc API

## Endpoint

- Tiền tố `/api`. Danh từ số nhiều, kebab-case: `/api/tasks`, `/api/department-dashboards`.
- CRUD: `GET /x`, `GET /x/:id`, `POST /x`, `PATCH /x/:id`, `DELETE /x/:id` (DELETE = archive/soft delete).
- Hành động là sub-resource động từ: `PATCH /api/tasks/:id/move`, `POST /api/leave-requests/:id/approve`.
- Trang (route web) KHÔNG phải endpoint.

## Response thành công

```json
{ "data": { ... } }
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 20, "total": 134 } }
```

## Response lỗi (xem docs/api/errors.md)

```json
{ "error": { "code": "TASK_NOT_FOUND", "message": "Không tìm thấy công việc", "requestId": "..." } }
```

- `code` UPPER_SNAKE_CASE, ổn định để FE xử lý; `message` tiếng Việt cho người dùng.
- Không lộ stack trace, câu SQL, thông tin nội bộ.

## Phân trang & lọc

- `?page=1&pageSize=20` (tối đa 100). Lọc: `?status=in_progress&assigneeId=...`. Sắp xếp: `?sort=-dueDate`.

## Quy ước

- JSON camelCase ở API; DB snake_case — map trong repository.
- Ngày giờ ISO 8601 UTC; FE hiển thị theo giờ Việt Nam.
- Mỗi endpoint mới/đổi → cập nhật `docs/api/endpoints/<module>.md`.
