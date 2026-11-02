# Vercel — web (`apps/web`)

Quyết định: [ADR 009](../decisions/009-hosting-vercel-workers-supabase.md). Deploy bằng **Vercel Git Integration**
(không có workflow deploy web trong `.github/workflows/` — một cơ chế duy nhất).

## Cấu hình trong repo

`apps/web/vercel.json`:

- `installCommand`: `pnpm install --frozen-lockfile` — Vercel đọc `packageManager` (pnpm 10.18.0) và cài cả
  workspace từ thư mục gốc.
- `buildCommand`: `pnpm build` (= `tsc -p tsconfig.json && vite build` của `apps/web`), `outputDirectory`: `dist`.
- `rewrites`: `/(.*) → /index.html` — mở trực tiếp hoặc F5 ở `/app/...` không bị 404. Vercel phục vụ file tĩnh có
  thật (`/assets/...`) trước khi rewrite.
- Node: `.nvmrc` = 22 (cùng CI).

## Tạo project lần đầu (chủ dự án, làm một lần)

1. Vercel → **Add New → Project** → Import repo GitHub `ThongTranU/CRM-Business` (cấp quyền Vercel GitHub App cho
   repo này).
2. **Root Directory**: `apps/web`. Bật "Include files outside the root directory" (mặc định bật — cần cho
   workspace pnpm). Framework: Vite (tự nhận từ `vercel.json`). Không sửa Build / Install / Output trên giao diện —
   để `vercel.json` quyết định.
3. **Settings → Git**: Production Branch = `main`. Preview cho mọi nhánh khác / PR (mặc định).
4. **Settings → Environment Variables** — khai báo **riêng** từng môi trường (bảng dưới). Không tick "Production"
   cho giá trị staging và ngược lại.
5. **Settings → Deployment Protection**: bật Vercel Authentication cho Preview (chỉ thành viên team xem được bản
   Preview).
6. Deploy lần đầu chỉ khi chủ dự án đồng ý và đã làm `docs/deployment/production-checklist.md`.

## Biến môi trường

Chỉ biến `VITE_*` — chúng **công khai** (nằm trong bundle JS). Không bao giờ đặt `SUPABASE_SERVICE_ROLE_KEY` hay
secret nào ở Vercel.

| Biến                     | Production                               | Preview                                 |
| ------------------------ | ---------------------------------------- | --------------------------------------- |
| `VITE_API_URL`           | URL Worker `crm-api` (vd. workers.dev)   | URL Worker `crm-api-staging`            |
| `VITE_SUPABASE_URL`      | `https://<project-hiện-tại>.supabase.co` | `https://<project-staging>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | anon key project hiện tại                | anon key project staging                |

Preview **không** trỏ tới project Supabase đang có dữ liệu nhân sự thật. Chưa có staging → để trống 3 biến Preview:
bản Preview chỉ để xem giao diện, đăng nhập sẽ báo lỗi (chấp nhận được, an toàn hơn).

Đổi biến xong phải **Redeploy** (Vite đóng biến vào bundle lúc build).

## Domain và các chỗ phải khai báo theo

Sau khi biết domain Production (vd. `crm-business.vercel.app` hoặc domain riêng) và tiền tố Preview (vd.
`crm-business-git-*-<team>.vercel.app`):

- Cloudflare `ALLOWED_ORIGINS` — xem `cloudflare.md`.
- Supabase Auth Site URL / Redirect URLs — xem `supabase.md`.

## Deploy hằng ngày

- Mở PR → Vercel build Preview, gắn link vào PR; CI chạy song song.
- Merge PR vào `main` (chỉ khi CI đạt — `ci-cd.md`) → Vercel tự deploy Production.
- Có migration hoặc đổi API → làm theo thứ tự ở `ci-cd.md` mục "Thứ tự khi có migration".
