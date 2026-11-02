# Kiến trúc triển khai

Quyết định: [ADR 009](../decisions/009-hosting-vercel-workers-supabase.md). Hướng dẫn từng bước: `docs/deployment/`.

| Thành phần | Nơi chạy             | Cấu hình                                                               | Deploy                                                                     |
| ---------- | -------------------- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Web        | Vercel               | `apps/web/vercel.json` (build Vite, SPA rewrite `/(.*) → /index.html`) | Vercel Git Integration: PR / nhánh → Preview, `main` → Production          |
| API        | Cloudflare Workers   | `apps/api/wrangler.toml`, secret qua `wrangler secret put`             | Tay: `pnpm --filter @crm/api deploy` (chưa tự động)                        |
| DB         | Supabase (Singapore) | `supabase/config.toml`, `supabase/migrations/`                         | Tay: SQL Editor theo `docs/changelog/migrations.md`, **trước** deploy code |
| CI         | GitHub Actions       | `.github/workflows/ci.yml`                                             | Chạy mọi PR và push `main`; không deploy                                   |

## Môi trường

|             | Web                                 | API                                           | DB                                                                          |
| ----------- | ----------------------------------- | --------------------------------------------- | --------------------------------------------------------------------------- |
| development | localhost:5173                      | localhost:8787 (`wrangler dev`)               | project Supabase hiện tại (dev)                                             |
| preview     | `*.vercel.app` theo từng PR / nhánh | Worker staging (`crm-api-staging`)            | project Supabase **staging, dữ liệu giả** — không dùng dữ liệu nhân sự thật |
| production  | domain Production của Vercel        | Worker `crm-api` (workers.dev / domain riêng) | project Supabase hiện tại (Free)                                            |

## Biến môi trường

- Web (Vercel, khai báo riêng Preview / Production; local: `apps/web/.env.local`): `VITE_API_URL`,
  `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — công khai, nằm trong bundle, **không** đặt secret.
- API (Cloudflare; local: `apps/api/.dev.vars`): `SUPABASE_URL`, secret `SUPABASE_SERVICE_ROLE_KEY` (chỉ ở đây);
  `ALLOWED_ORIGINS` (danh sách origin, cho phép mẫu hẹp có `*` cho Preview — `docs/deployment/cloudflare.md`).
