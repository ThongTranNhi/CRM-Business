# Đăng ký và ảnh hồ sơ

Chạy migration MỚI `supabase/migrations/20261005160000_registration_profiles.sql`
sau migration employee_directory. Không chạy lại migration đầu tiên.
Migration này chưa được chạy lên project từ phiên làm việc này.

## Thiết lập dashboard

- Supabase Auth: bật email/password và cho phép đăng ký mới, bật Confirm email.
- Đặt độ dài mật khẩu tối thiểu 12 ở Supabase; UI kiểm tra 12–128 ký tự.
- URL Configuration: Site URL và redirect allowlist `http://localhost:5173`.
- Cấu hình SMTP cho email đăng ký công ty. SMTP mặc định có hạn mức và giới hạn người nhận.
- API local: điền key backend trong apps/api/.dev.vars, chạy API ở cổng 8787.
  Không đưa secret vào web. Web VITE_API_URL=http://localhost:8787.

## Luồng dữ liệu

Auth quản lý mật khẩu. Trigger tạo account role employee và hồ sơ từ tên hiển thị,
không nhận quyền/phòng ban/mã nhân viên từ user_metadata. Backfill không ghi đè role
hay hồ sơ hiện có. Chức vụ, mã nhân viên được NULL trước khi bổ sung.
CEO/Master đã có tài khoản được bổ sung hồ sơ mà không mất quyền.
Tài khoản mới chưa có phòng ban hoặc chức vụ; không tự được truy cập hồ sơ người khác.

Đăng ký `/auth/register`; hồ sơ `/app/profile`. Đường dẫn hồ sơ có trong menu người dùng.
Mã nhân viên do chính nhân viên nhập sau; chưa có cơ chế HR xác nhận mã đó.
Mã không phải yếu tố xác thực, không được dùng để cấp quyền hoặc ghép với hồ sơ người khác.

## Storage

Bucket `profile-avatars` PRIVATE; tối đa 2 MB; MIME JPG/PNG/WebP; đường dẫn
`<auth-user-uuid>/<random-uuid>.<extension>`. INSERT chỉ cho owner có account active
và hồ sơ active. Không có policy đọc/update/delete trực tiếp qua trình duyệt.
Không dùng upsert: thay ảnh tạo object mới. API kiểm tra quyền trước khi ký URL.
Ảnh cũ hoặc upload thành công nhưng lưu hồ sơ thất bại vẫn nằm trong Storage:
cần tác vụ dọn object không còn tham chiếu khi vận hành. Không xóa tự động ở phiên này.
URL đã ký có thể còn sử dụng đến 5 phút sau khi khóa tài khoản.
Browser kiểm tra decode ảnh; bucket kiểm tra MIME/dung lượng, không phải hệ thống quét malware.

## Kiểm thử cần chạy trên Supabase

Đăng ký email mới -> xác nhận -> hồ sơ trống mã/chức vụ; không tự chọn role.
Cập nhật mã, thử trùng mã khác hoa thường; upload ảnh hợp lệ, >2 MB, SVG và sai owner.
Thử đọc/ghi profile của tài khoản khác; khóa app_account và gọi API bằng JWT cũ.
Kiểm tra audit actor_account_id đúng khi cập nhật hồ sơ.
Kiểm tra hai tài khoản super_admin được backfill mà không bị đổi quyền.
Postgres/Docker hiện không sẵn sàng nên kiểm thử database chưa được thực hiện.
Script scripts/generate-types.sh hiện trống, chưa thể sinh types database.
