# Kiến trúc CRM-for business

Monorepo pnpm + Turborepo gồm 2 app và Supabase:

|             | Công nghệ                               | Hosting              |
| ----------- | --------------------------------------- | -------------------- |
| `apps/web`  | React + Vite + React Query + Tailwind   | Netlify              |
| `apps/api`  | Hono                                    | Cloudflare Workers   |
| `supabase/` | Postgres + RLS, Auth, Storage, Realtime | Supabase (Singapore) |

Nguyên tắc: mọi thao tác ghi đi qua API; quyền kiểm tra ở backend; DB là nguồn sự thật.

Đọc tiếp:

- `docs/architecture/system-architecture.md` — sơ đồ tổng
- `docs/architecture/permission-model.md` — phân quyền
- `rules/architecture-rules.md` — cấu trúc thư mục bắt buộc
- `docs/decisions/` — các quyết định đã chốt
