# Kiến trúc xác thực

```
Web ──(email/password)──▶ Supabase Auth ──▶ access_token (JWT)
Web ──Bearer token──▶ API (auth.middleware: verify JWKS bằng jose) ──▶ context { id, email, role }
```

- Web: `@supabase/supabase-js` chỉ dùng cho đăng nhập, đăng xuất, quên/đổi mật khẩu, refresh token (`features/auth`).
- API xác minh JWT qua JWKS `<SUPABASE_URL>/auth/v1/.well-known/jwks.json` (cache theo isolate).
- **Role đọc từ `app_metadata.role`** (chỉ server ghi được). Mặc định `employee`. CẤM `user_metadata`.
- Gán/đổi role: chỉ qua API (Super Admin) dùng service role → ghi audit log.
- Không có đăng ký công khai: tài khoản do HR/Admin tạo (hoặc qua onboarding).
- Route web cần đăng nhập bọc trong `ProtectedRoute`; hết phiên → về `/auth/login` (nhớ trang đang mở để quay lại).
