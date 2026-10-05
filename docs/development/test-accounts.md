# Tài khoản thử theo role (chỉ môi trường dev)

> KHÔNG làm trên production. KHÔNG ghi mật khẩu vào repo, chat hay tài liệu.

## Super Admin

Dùng hai tài khoản CEO và Master (đăng nhập Google theo allowlist,
xem `docs/database/employee-directory-setup.md`). Không tạo thêm Super Admin.

## HR Admin và Nhân viên

1. Chạy đủ migration theo `docs/changelog/migrations.md`.
2. Mở web, vào `/auth/register`, đăng ký 2 tài khoản username, ví dụ `test.hr` và `test.nhanvien`.
   Mật khẩu 12–128 ký tự, tự giữ riêng.
3. Mặc định cả hai là `employee`. Nâng `test.hr` thành `hr_admin` bằng SQL Editor (dev):

```sql
-- Đổi role ở cả bảng app_accounts và app_metadata (JWT); API từ chối khi hai nơi lệch nhau.
begin;
update public.app_accounts set role = 'hr_admin' where username = 'test.hr';
update auth.users set raw_app_meta_data = raw_app_meta_data || '{"role": "hr_admin"}'::jsonb
where id = (select auth_user_id from public.app_accounts where username = 'test.hr');
commit;
```

4. Người được đổi role phải **đăng xuất và đăng nhập lại** để nhận JWT mới.
5. (Tuỳ chọn) Gán phòng ban cho tài khoản thử ở trang Phòng ban → [Thêm thành viên].

Đổi lại thành nhân viên thường: chạy cùng đoạn SQL với `'employee'`.
Role hợp lệ: `super_admin`, `hr_admin`, `department_manager`, `team_leader`, `employee`
(`docs/product/user-roles.md`). Không dùng SQL này để tạo Super Admin.
