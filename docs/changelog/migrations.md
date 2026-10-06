# Migration

## Cách áp (SQL Editor của Supabase)

Chạy **đúng thứ tự** dưới đây, mỗi lần dán **nguyên một file**. Mỗi file mới (từ 20261006…) bọc trong
`begin; … commit;` — lỗi giữa chừng thì không thay đổi gì. File mới kiểm tra file trước đã chạy chưa;
chưa thì dừng với thông báo `Chạy <tên file> trước`. Lỡ chạy lại một file đã chạy không làm hỏng dữ liệu.

| #   | File                                                  | Ngày chạy (chủ dự án điền) |
| --- | ----------------------------------------------------- | -------------------------- |
| 1   | `20261005120000_employee_directory.sql`               |                            |
| 2   | `20261005160000_registration_profiles.sql`            |                            |
| 3   | `20261005200000_username_admin_directory.sql`         |                            |
| 4   | `20261005210000_sync_local_usernames.sql`             |                            |
| 5   | `20261006090000_migration_tracking.sql`               |                            |
| 6   | `20261006090100_departments_optional_manager.sql`     |                            |
| 7   | `20261006090200_department_management_rpcs.sql`       |                            |
| 8   | `20261006090300_employee_soft_delete.sql`             |                            |
| 9   | `20261006090400_employee_restore_previous_status.sql` |                            |
| 10  | `20261006090500_super_admin_titles.sql`               |                            |

Sau đó (chỉ môi trường dev): `supabase/seed.sql`, rồi chạy kiểm tra `supabase/tests/soft_delete_views.sql`
và `supabase/tests/employee_restore_status.sql` (tự ROLLBACK, thấy thông báo `soft_delete_views: đạt`,
`employee_restore_status: đạt` là đúng).

Xem migration đã chạy:

```sql
select name, applied_at from app_private.applied_migrations order by name;
```

## Nhật ký

- `20261006090500_super_admin_titles.sql`: cột `super_admin_allowlist.title` — nhãn hiển thị CEO
  (`jathong0107@gmail.com`) / Master (`thongtran2446@gmail.com`); `crm_session_context` trả thêm `adminTitle`
  (chỉ với `super_admin`). Không đổi quyền.
- `20261006090400_employee_restore_previous_status.sql`: khôi phục nhân viên trả tài khoản về trạng thái
  trước khi xoá (khoá trước khi xoá thì vẫn khoá) thay vì luôn `active`. `crm_delete_employee` lưu
  `previousAccountStatus` vào audit `employee.delete`; `crm_restore_employee` đọc audit gần nhất, không có thì
  `active`, và ghi `restoredAccountStatus` vào audit `employee.restore`.
- `20261006090300_employee_soft_delete.sql`: xoá / khôi phục nhân viên (BR-53) bằng RPC — khoá tài khoản,
  thu hồi phiên, gỡ chức trưởng phòng, audit; mã nhân viên chỉ unique giữa người chưa xoá; view
  `employee_directory`, `active_employees`.
- `20261006090200_department_management_rpcs.sql`: RPC tạo / sửa / chuyển nhân viên / xoá mềm (BR-09,
  chuyển toàn bộ nhân viên sang phòng nhận) / khôi phục phòng ban; thay `crm_admin_update_employee` để
  đổi phòng của trưởng phòng không còn lỗi khoá ngoại.
- `20261006090100_departments_optional_manager.sql`: trưởng phòng tuỳ chọn (BR-08); tên phòng unique
  chỉ giữa phòng chưa xoá; view `active_departments`.
- `20261006090000_migration_tracking.sql`: bảng `app_private.applied_migrations`, ghi nhận 4 migration cũ.

- `20261005210000_sync_local_usernames.sql`: sửa username map khi Auth Admin ghi
  app_metadata sau INSERT, backfill account cũ và RPC kiểm tra username đã tồn tại.

- `20261005200000_username_admin_directory.sql`: username và đăng ký không SMTP,
  phiên đăng nhập có thể thu hồi, bắt buộc đổi mật khẩu tạm, rate limit bền vững,
  RPC quản trị hồ sơ và reset có audit.

- `20261005160000_registration_profiles.sql`: mã nhân viên/chức vụ nullable,
  avatar_path, trigger tạo hồ sơ employee khi signup, backfill giữ quyền cũ,
  private Storage bucket/policy và RPC cập nhật hồ sơ có audit actor.

- `20261005120000_employee_directory.sql`: hồ sơ tối giản, mã nhân viên unique,
  phòng ban với một trưởng phòng cùng phòng, 5 vai trò hệ thống, trạng thái tài khoản,
  audit bất biến, RLS mặc định từ chối và cấp super_admin cho hai Google identity
  được allowlist.
