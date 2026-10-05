# Kiến trúc Backend

- Cấu trúc & luật: `rules/backend-rules.md`, `rules/api-rules.md`.
- `index.ts` export Worker; `app.ts` tạo `Hono<AppEnv>`, gắn middleware toàn cục, mount `modules/*/<m>.routes.ts` dưới `/api`.
- Thứ tự: `request-id` → `cors` (theo `ALLOWED_ORIGINS`) → route công khai (`/api/health`) → `auth` cho mọi `/api/*` còn lại → module. `onError` = `errorHandler`, `notFound` = `notFoundHandler`.
- `permission.middleware`: `requireRole(...)` gắn theo route.
- Env: `config/env.ts` (`readEnv` kiểm tra bằng zod). Kiểu context: `lib/app-env.ts`. Lỗi: `lib/app-error.ts`.
- Truy cập DB: `lib/supabase.ts` (sẽ thêm cùng module đầu tiên) tạo client service role từ env.
- Thao tác nhiều bước cần nguyên tử (vd. move task + ghi activity) → Postgres function gọi qua RPC.
