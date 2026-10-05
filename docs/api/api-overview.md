# Tổng quan API

- Base URL: `VITE_API_URL` (dev: `http://localhost:8787`), mọi route bắt đầu `/api`.
- Xác thực: header `Authorization: Bearer <Supabase access token>` (xem `authentication.md`).
- Định dạng: JSON camelCase, thời gian ISO 8601 UTC.
- Thành công: `{ data }` hoặc `{ data, meta }`. Lỗi: xem `errors.md`. Phân trang: `pagination.md`.
- Quy tắc thiết kế: `rules/api-rules.md`. Danh sách endpoint: `endpoints/*.md`.

| Endpoint          | Mô tả                                                              |
| ----------------- | ------------------------------------------------------------------ |
| `GET /api/health` | Kiểm tra API sống (không cần đăng nhập) → `{ status: "ok", time }` |
