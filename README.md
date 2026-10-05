# CRM-for business

Web app nội bộ quản lý công việc và nhân sự (Work Management + HRM).

- **Web:** React + Vite (Netlify) — `apps/web`
- **API:** Hono (Cloudflare Workers) — `apps/api`
- **DB:** Supabase — `supabase/`

## Bắt đầu

```bash
corepack enable && corepack prepare pnpm@10.18.0 --activate
pnpm install
cp apps/web/.env.example apps/web/.env.local     # điền VITE_*
cp apps/api/.dev.vars.example apps/api/.dev.vars # điền SUPABASE_*
pnpm dev   # web: http://localhost:5173 · api: http://localhost:8787/api/health
```

Lệnh khác: `pnpm lint` · `pnpm typecheck` · `pnpm build`.

## Tài liệu

- Mô tả dự án: `PROJECT_DESCRIPTION.md`
- Quy tắc (bắt buộc đọc trước khi code): `CLAUDE.md`, `rules/`
- Kiến trúc: `ARCHITECTURE.md`, `docs/architecture/`
- Nghiệp vụ: `docs/requirements/business-rules.md`, `docs/features/`
