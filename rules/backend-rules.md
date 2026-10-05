# Quy tắc Backend (apps/api)

## Lớp và trách nhiệm

| Lớp        | Được làm                                                           | Không được làm             |
| ---------- | ------------------------------------------------------------------ | -------------------------- |
| routes     | khai báo path, gắn middleware, validator                           | logic                      |
| controller | lấy input đã validate, gọi service, trả response                   | truy vấn DB, nghiệp vụ     |
| service    | toàn bộ nghiệp vụ, kiểm tra quyền theo dữ liệu, ghi activity/audit | biết về `Context` của Hono |
| repository | truy vấn Supabase, map dữ liệu                                     | nghiệp vụ, kiểm tra quyền  |

## Quy tắc

- Mọi input validate bằng zod (`<module>.schema.ts`).
- Lỗi nghiệp vụ: `throw new AppError(code, message, status)` từ `lib/app-error.ts`. Không tự trả JSON lỗi trong controller.
- Kiểu Hono dùng chung: `AppEnv` trong `lib/app-env.ts` (`c.get('user')` có `id`, `email`, `role`).
- Quyền 2 tầng: `requireRole(...)` trong `permission.middleware` + service (theo dữ liệu: có phải manager phòng này không...).
- Thay đổi quan trọng → ghi `task_activities` hoặc `audit_logs` trong cùng service.
- Mỗi request gọi DB ít lần nhất có thể (DB ở Singapore). Gom truy vấn, chọn cột cụ thể.
- Thao tác nhiều bước cần nhất quán → Postgres function (RPC) trong migration.
- Secret chỉ đọc qua `config/env.ts` (bindings từ `wrangler secret` / `.dev.vars`).
- Không dùng thư viện cần Node API. Không xử lý nặng trong request.
