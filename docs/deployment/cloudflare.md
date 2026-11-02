# Cloudflare Workers — API (`apps/api`)

Deploy **tay**, chỉ khi chủ dự án duyệt (không có workflow / Workers Builds tự động). Cấu hình ở
`apps/api/wrangler.toml`; đăng nhập một lần: `pnpm --filter @crm/api exec wrangler login`.

## Môi trường trong `wrangler.toml`

| Môi trường   | Worker        | Dùng cho                   | `SUPABASE_URL`                             | `ALLOWED_ORIGINS`       |
| ------------ | ------------- | -------------------------- | ------------------------------------------ | ----------------------- |
| cấp gốc      | `crm-api-dev` | `wrangler dev` (local)     | `.dev.vars`                                | `http://localhost:5173` |
| `production` | `crm-api`     | web Production trên Vercel | `https://umsabjhsemgsbrqmqjgv.supabase.co` | domain Production thật  |

- Tên Worker cấp gốc khác Production: lỡ chạy `wrangler deploy` thiếu `--env production` cũng không ghi đè
  `crm-api`. Script `pnpm --filter @crm/api deploy` luôn chạy `wrangler deploy --env production`.
- `vars` và `triggers` không kế thừa sang `[env.*]` nên khai báo lại trong `[env.production]` (cron `0 1 * * *` =
  08:00 giờ Việt Nam, nhắc việc sắp / quá hạn).
- `.dev.vars` chỉ dùng cho `wrangler dev`, không bao giờ cung cấp biến cho Production.
- Staging (cho Preview) chưa có: khi tạo, thêm `[env.staging]` với `name = "crm-api-staging"`, Supabase staging và
  mẫu Preview trong `ALLOWED_ORIGINS`.

## Secret (một lần cho mỗi Worker)

```bash
pnpm --filter @crm/api exec wrangler secret put SUPABASE_SERVICE_ROLE_KEY --env production
```

Dán key khi được hỏi — không đặt trong lệnh, file, chat hay log. Lưu ý: với Worker đã tồn tại, `secret put` tạo ngay
một version mới (đang phục vụ); Worker chưa tồn tại thì Wrangler tạo Worker rỗng để gắn secret.

## CORS — `ALLOWED_ORIGINS`

Danh sách origin cách nhau bằng dấu phẩy. Mỗi mục là origin đầy đủ, hoặc **mẫu hẹp** có đúng một `*` nằm giữa nhãn
tên miền đã có chữ cố định phía trước (`isAllowedOrigin` ở `src/config/env.ts`, có test):

- Được: `https://crm-business-git-*-<team>.vercel.app` (`*` khớp chữ thường / số / gạch ngang, không khớp dấu chấm).
- Bị bỏ qua: `*`, `https://*.vercel.app` (mọi app Vercel), `http://…`, mẫu nhiều `*`.

Production chỉ chứa domain Production thật. Rỗng (`""`) = chưa trình duyệt nào gọi được API — dùng khi deploy API
trước khi có domain Vercel. Có domain → sửa `[env.production.vars]` qua PR, merge, deploy lại.

## Deploy

```bash
pnpm --filter @crm/api exec wrangler deploy --env production --dry-run --outdir dist   # xem biến trước
pnpm --filter @crm/api exec wrangler deployments list --env production                   # ghi version hiện tại
pnpm --filter @crm/api deploy                                                            # = deploy --env production
```

Deploy từ commit đã merge vào `main`, trong worktree sạch (không có thay đổi chưa commit).

## Kiểm tra sau deploy

- `curl https://<worker>/api/health` → `200 {"status":"ok",…}`.
- `curl https://<worker>/api/auth/me` không token → `401 UNAUTHENTICATED`.
- Đọc một endpoint bằng phiên hợp lệ (đăng nhập web) → 200.
- Preflight `OPTIONS` từ domain Production có `Access-Control-Allow-Origin`; từ origin lạ thì không.
- Cloudflare Dashboard → Worker `crm-api` → Settings → Triggers: cron `0 1 * * *`. Không chạy thử cron trên
  Production (tạo thông báo thật).
