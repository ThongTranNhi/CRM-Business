# Cloudflare Workers — API (`apps/api`)

Deploy **tay**, chỉ khi chủ dự án duyệt (chưa có workflow tự động). Cần đăng nhập: `pnpm --filter @crm/api exec
wrangler login`.

## Secret (một lần cho mỗi Worker)

```bash
pnpm --filter @crm/api exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY            # Production (crm-api)
pnpm --filter @crm/api exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env staging
```

Dán key khi được hỏi — không đặt trong lệnh, file, chat hay log. `SUPABASE_URL` đặt bằng `wrangler secret put` hoặc
trong `[vars]`.

## CORS — `ALLOWED_ORIGINS`

Danh sách origin cách nhau bằng dấu phẩy. Mỗi mục là origin đầy đủ, hoặc **mẫu hẹp** có đúng một `*` nằm giữa nhãn
tên miền đã có chữ cố định phía trước (`isAllowedOrigin` ở `src/config/env.ts`, có test):

- Được: `https://crm-business-git-*-<team>.vercel.app` (`*` khớp chữ thường / số / gạch ngang, không khớp dấu chấm).
- Bị bỏ qua: `*`, `https://*.vercel.app` (mọi app Vercel), `http://…`, mẫu nhiều `*`.

Khi đã có domain, thêm vào `apps/api/wrangler.toml` (qua PR):

```toml
[env.production]
name = "crm-api"
[env.production.vars]
ALLOWED_ORIGINS = "https://<domain-production>"

[env.staging]
name = "crm-api-staging"
[env.staging.vars]
ALLOWED_ORIGINS = "https://crm-business-git-*-<team>.vercel.app,https://<project>-*-<team>.vercel.app"
```

Production chỉ cho domain Production; mẫu Preview chỉ ở staging. `[vars]` gốc giữ `http://localhost:5173` cho
`wrangler dev`. `vars` không kế thừa sang `[env.*]` nên phải khai báo trong từng môi trường; xem output của
`wrangler deploy --env … --dry-run` để chắc cron (`[triggers]`) và biến đúng như mong muốn trước khi deploy thật.

## Deploy

```bash
pnpm --filter @crm/api exec wrangler deploy --env staging      # API cho Preview
pnpm --filter @crm/api exec wrangler deploy --env production   # chỉ khi chủ dự án duyệt
```

Kiểm tra: `curl https://<worker>/api/health` → `{"status":"ok"}`.
