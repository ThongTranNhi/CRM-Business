# Supabase

Project hiện tại (Free, Singapore) dùng cho development và Production. Preview dùng project **staging riêng, dữ liệu
giả** (tạo khi cần — `environments.md`).

## Migration — áp tay, trước khi deploy code

Không có bước CI / Vercel nào tự áp migration. Làm theo `docs/changelog/migrations.md`:

1. Áp lên staging (nếu có), chạy SQL test tương ứng trong `supabase/tests/` (tự ROLLBACK, thấy "…: đạt").
2. Áp lên Production **trước** khi merge / deploy code dùng schema mới (`ci-cd.md` mục "Thứ tự khi có migration").
3. Ghi ngày áp vào `docs/changelog/migrations.md`.

Kiểm tra đã áp: `select name, applied_at from app_private.applied_migrations order by name;`

Lưu ý gói Free: project không hoạt động 7 ngày sẽ bị **tạm dừng** (tên miền `*.supabase.co` không phân giải → web báo
`ERR_NAME_NOT_RESOLVED`). Vào dashboard → Restore project.

## Auth — Site URL, Redirect URLs, Google

Đăng nhập Google gọi `signInWithOAuth({ redirectTo: window.location.origin })`
(`apps/web/src/features/auth/api/auth.api.ts`), nên mọi origin web phải nằm trong danh sách cho phép.

Supabase → **Authentication → URL Configuration**:

| Project    | Site URL                      | Redirect URLs                                                                 |
| ---------- | ----------------------------- | ----------------------------------------------------------------------------- |
| Production | `https://<domain-production>` | `https://<domain-production>/**`, `http://localhost:5173/**`                  |
| Staging    | `https://<domain-production>` | `https://crm-business-git-*-<team>.vercel.app/**`, `http://localhost:5173/**` |

Google Cloud Console (OAuth client) — Authorized redirect URI giữ là
`https://<project-ref>.supabase.co/auth/v1/callback` của từng project; không cần thêm domain Vercel ở Google.
