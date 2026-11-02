# Checklist Production

## Một lần (trước lần deploy Production đầu tiên)

- [ ] Vercel project tạo đúng theo `vercel.md` (Root Directory `apps/web`, Production Branch `main`).
- [ ] Đủ 3 biến `VITE_*` cho Production; Preview trỏ Supabase / API staging (chưa có thì Preview chỉ hiện "Chưa cấu
      hình môi trường") — không bao giờ trỏ dữ liệu thật.
- [ ] Preview bật Deployment Protection.
- [ ] Worker `crm-api`: secret `SUPABASE_SERVICE_ROLE_KEY`, `ALLOWED_ORIGINS` = domain Production (`cloudflare.md`).
- [ ] Supabase Auth: Site URL + Redirect URLs có domain Production (`supabase.md`).
- [ ] GitHub ruleset cho `main`: bắt buộc PR + check `Lint, typecheck, test, build` (`ci-cd.md`).

## Mỗi lần merge vào `main`

- [ ] CI xanh, Preview mở được, PR ghi rõ có migration / đổi API hay không.
- [ ] Có migration → đã áp Production và ghi ngày ở `docs/changelog/migrations.md`.
- [ ] Đổi API → đã deploy Worker trước khi merge web.

## Sau deploy

- [ ] `https://<worker>/api/health` → `{"status":"ok"}`.
- [ ] Mở domain Production, F5 ở một đường dẫn `/app/...` (không 404), đăng nhập Google và username.
- [ ] DevTools Console không có lỗi CORS. Lỗi → `rollback.md`.
