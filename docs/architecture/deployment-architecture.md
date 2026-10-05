# Kiến trúc triển khai

| Thành phần | Nơi chạy             | Cấu hình                                                      | Deploy                                                      |
| ---------- | -------------------- | ------------------------------------------------------------- | ----------------------------------------------------------- |
| Web        | Netlify              | `apps/web/netlify.toml` (SPA redirect `/* → /index.html 200`) | Netlify tự build khi push `main`                            |
| API        | Cloudflare Workers   | `apps/api/wrangler.toml`, secret qua `wrangler secret put`    | `pnpm --filter @crm/api deploy` (sau này: `deploy-api.yml`) |
| DB         | Supabase (Singapore) | `supabase/config.toml`, `supabase/migrations/`                | `supabase db push`                                          |

## Môi trường

|             | Web            | API                             | DB                                         |
| ----------- | -------------- | ------------------------------- | ------------------------------------------ |
| development | localhost:5173 | localhost:8787 (`wrangler dev`) | project Supabase dev                       |
| production  | domain Netlify | workers.dev / domain riêng      | project Supabase prod (gói Pro, có backup) |

## Biến môi trường

- Web (`apps/web/.env.local`): `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- API (`apps/api/.dev.vars` / secret): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`; `ALLOWED_ORIGINS` trong `wrangler.toml`.
