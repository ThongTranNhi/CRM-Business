# Xác thực API

1. Web đăng nhập bằng Supabase Auth → nhận `access_token` (JWT).
2. Mỗi request gửi `Authorization: Bearer <token>`.
3. `auth.middleware` xác minh chữ ký qua JWKS `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` (thư viện `jose`), kiểm tra hạn và issuer `<SUPABASE_URL>/auth/v1`.
4. Gắn vào context: `c.get('user')` = `{ id (sub), email, role }` — `role` từ `app_metadata.role`, mặc định `employee`.
5. Thiếu/sai/hết hạn → `401 UNAUTHENTICATED`.

Role chỉ được gán bởi server (service role) — xem `docs/architecture/auth-architecture.md`.
