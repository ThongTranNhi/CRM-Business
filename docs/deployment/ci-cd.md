# CI/CD

| Việc          | Công cụ                                   | Khi nào                           |
| ------------- | ----------------------------------------- | --------------------------------- |
| Kiểm tra code | GitHub Actions `.github/workflows/ci.yml` | Mọi pull request, mỗi push `main` |
| Deploy web    | Vercel Git Integration (`vercel.md`)      | PR → Preview; `main` → Production |
| Deploy API    | Tay — `cloudflare.md`                     | Khi chủ dự án duyệt               |
| Migration     | Tay — `supabase.md`                       | **Trước** deploy code cần nó      |

## CI (`ci.yml`)

Một job **"Lint, typecheck, test, build"** trên `ubuntu-latest`:

1. Checkout (không giữ token git), pnpm theo `packageManager` (10.18.0), Node theo `.nvmrc` (22), cache store pnpm.
2. `pnpm install --frozen-lockfile` — lockfile lệch là fail.
3. `pnpm exec prettier --check .` · `pnpm lint` · `pnpm typecheck` · `pnpm test` (API node:test + web vitest).
4. `pnpm --filter @crm/web build` (Vite production build) và
   `pnpm --filter @crm/api exec wrangler deploy --dry-run --outdir dist` (đóng gói Worker, không gửi lên Cloudflare).

An toàn: `permissions: contents: read`, không dùng secret, không đặt `VITE_*` (build CI không cần giá trị thật),
không upload artifact. Commit mới trên cùng PR / nhánh huỷ lượt CI cũ (`concurrency`).

Chạy giống CI ở máy: `pnpm install --frozen-lockfile && pnpm exec prettier --check . && pnpm lint && pnpm typecheck
&& pnpm test && pnpm --filter @crm/web build`.

## Bảo vệ `main` (chủ dự án cấu hình trên GitHub)

GitHub → repo → **Settings → Rules → Rulesets → New branch ruleset** (hoặc Branches → Branch protection rule):

- Target: `main`. Enforcement: Active.
- **Restrict deletions**, **Block force pushes**.
- **Require a pull request before merging** (số người duyệt tuỳ đội; tối thiểu 0 nếu làm một mình).
- **Require status checks to pass**: thêm check **`Lint, typecheck, test, build`** (chỉ chọn được sau khi CI đã chạy
  ít nhất một lần trên PR). Bật "Require branches to be up to date before merging".
- Tuỳ chọn: thêm check **Vercel** (Preview build thành công) làm required.

Kết quả: chỉ merge được khi CI xanh → chỉ code đã qua CI mới lên Production.

## Thứ tự khi có migration

Code mới thường đọc cột / bảng mới — deploy code trước migration sẽ lỗi (ví dụ board đọc `link_count`).

1. Áp migration lên Supabase **staging** (nếu có), thử trên Preview.
2. Áp migration lên Production **trước khi merge**. Migration trong repo chỉ thêm bảng / cột / view, nên code đang
   chạy vẫn dùng được schema mới.
3. PR đổi API → deploy Worker (`cloudflare.md`).
4. Merge khi CI xanh → Vercel deploy web Production. Kiểm tra `production-checklist.md` mục "Sau deploy".
