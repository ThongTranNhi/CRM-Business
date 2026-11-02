# Môi trường

|              | development                 | preview                           | production               |
| ------------ | --------------------------- | --------------------------------- | ------------------------ |
| Web          | `pnpm dev` → localhost:5173 | Vercel, mỗi PR / nhánh một URL    | Vercel, nhánh `main`     |
| API          | `wrangler dev` → :8787      | Worker `crm-api-staging`          | Worker `crm-api`         |
| Supabase     | project hiện tại            | project **staging — dữ liệu giả** | project hiện tại (Free)  |
| Ai tạo / đổi | lập trình viên              | tự động khi push                  | tự động khi merge `main` |

Preview không bao giờ trỏ tới project có dữ liệu nhân sự thật. Chưa có staging thì để trống biến Preview (chỉ xem
giao diện).

## Biến — ở đâu, ai thấy

| Biến                        | Đặt ở                                       | Công khai?     | Ghi chú                                       |
| --------------------------- | ------------------------------------------- | -------------- | --------------------------------------------- |
| `VITE_API_URL`              | Vercel (Preview / Production), `.env.local` | Có             | URL Worker tương ứng                          |
| `VITE_SUPABASE_URL`         | như trên                                    | Có             |                                               |
| `VITE_SUPABASE_ANON_KEY`    | như trên                                    | Có             | anon key, RLS chặn mọi bảng với `anon`        |
| `SUPABASE_URL`              | `wrangler.toml` / Cloudflare, `.dev.vars`   | Không nhạy cảm |                                               |
| `SUPABASE_SERVICE_ROLE_KEY` | **chỉ** `wrangler secret put`, `.dev.vars`  | **Bí mật**     | Không bao giờ ở Vercel, GitHub, `VITE_*`, log |
| `ALLOWED_ORIGINS`           | `wrangler.toml` `[vars]` / `[env.*.vars]`   | Không nhạy cảm | Origin web được gọi API (`cloudflare.md`)     |

GitHub Actions hiện không cần secret nào. `.env.local`, `.dev.vars`, `.vercel/` đã nằm trong `.gitignore`.
