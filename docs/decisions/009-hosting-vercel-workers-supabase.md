# ADR 009: Web chuyển sang Vercel (giữ Cloudflare Workers + Supabase)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-11-04
- **Thay thế:** phần "Web: Netlify" của [ADR 006](006-hosting-netlify-workers-supabase.md). Các phần còn lại của ADR
  006 (API trên Cloudflare Workers, Supabase Singapore, pnpm 10.18) giữ nguyên. Câu "Deploy Netlify" ở ADR 002 và
  "Production (Netlify)" ở ADR 007 đọc thành Vercel.

## Bối cảnh

Chủ dự án muốn mỗi pull request có bản xem thử (Preview) riêng và `main` tự lên Production, kèm CI chặn merge khi
kiểm tra không đạt. Vercel có sẵn Preview theo từng PR / nhánh, tự nhận monorepo pnpm và Vite.

## Quyết định

- **Web (`apps/web`) → Vercel**, deploy bằng **Vercel Git Integration** (không thêm workflow deploy web — tránh hai
  cơ chế deploy trùng nhau). PR / nhánh → Preview; `main` → Production. Cấu hình build và SPA rewrite ở
  `apps/web/vercel.json`.
- **API (`apps/api`) → Cloudflare Workers**, giữ nguyên, vẫn deploy tay (`wrangler deploy`).
- **Database / Auth / Storage → Supabase Free hiện tại**, giữ nguyên. Migration vẫn áp tay, trước khi deploy code
  cần nó.
- **CI = GitHub Actions** (`.github/workflows/ci.yml`): format, lint, typecheck, test, build cho mọi PR và push
  `main`; là required check của nhánh `main`.
- **Preview không dùng database có dữ liệu nhân sự thật**: biến môi trường Preview của Vercel trỏ tới API staging +
  project Supabase staging (dữ liệu giả). Chưa có staging thì Preview chỉ để xem giao diện, không đăng nhập được.

## Hệ quả

- Biến `VITE_*` khai báo riêng cho Preview và Production trên Vercel; `SUPABASE_SERVICE_ROLE_KEY` chỉ nằm ở
  Cloudflare Workers.
- API chấp nhận origin Preview qua mẫu hẹp có `*` trong `ALLOWED_ORIGINS` (`isAllowedOrigin` ở
  `apps/api/src/config/env.ts`) — không mở `*` cho mọi nơi.
- Supabase Auth phải thêm domain Vercel vào Site URL / Redirect URLs (đăng nhập Google quay về
  `window.location.origin`).
- Hướng dẫn: `docs/deployment/vercel.md`, `ci-cd.md`, `environments.md`, `rollback.md`.
