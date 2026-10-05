# Username, Google và quản lý nhân viên

## Các bước kích hoạt

1. Đã chạy migration employee_directory và registration_profiles trước đó.
2. Chạy migration mới `supabase/migrations/20261005200000_username_admin_directory.sql` một lần.
3. Điền secret backend trong `apps/api/.dev.vars`: SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY.
4. Chạy `pnpm --filter @crm/api dev` (8787), `pnpm --filter @crm/web dev` (5173).
5. Google provider giữ nguyên; CEO và Master đăng nhập Google.
6. Đăng ký nhân viên bằng username, mật khẩu và xác nhận; không yêu cầu email.

Username lowercase 3–32 ký tự: chữ ASCII, số, `_`, `-`, `.`; không trùng.
Mật khẩu 12–128 ký tự, Supabase Auth lưu hash. Backend gán một định danh email kỹ thuật
random dưới miền dành riêng `.invalid`; đây không phải email người dùng và không gửi thư.
Luồng Admin createUser với email_confirm tạo phiên đăng nhập username không cần SMTP.
Cần kiểm thử việc Supabase chấp nhận định danh này trên project trước khi đưa vào vận hành.
Tài khoản Google không đổi; tài khoản email/password cũ chưa có username cần migration
gán username riêng nếu muốn chuyển đổi. Không tự ghép tài khoản chỉ theo tên hay mã nhân viên.

## Mục Tất cả nhân viên

`/app/employees`: chỉ super_admin, phân trang 25 bản ghi, có trang hồ sơ chi tiết.
CEO/Master sửa tên, chức vụ, phòng ban, active/disabled; không đổi role qua form này.
Không cho sửa/khóa quản trị viên bằng luồng nhân viên để tránh tự khóa hai quản trị viên.
Phòng ban phải chưa bị xoá; trưởng phòng là tuỳ chọn (BR-08); danh sách chọn lấy tối đa 100 phòng.
Nếu nhân viên là trưởng phòng mà bị chuyển sang phòng khác, phòng cũ thành "Chưa có trưởng phòng".
Xoá / khôi phục nhân viên (BR-53): docs/api/endpoints/users.md.

Đặt lại mật khẩu chỉ tài khoản username active không phải super_admin.
Admin nhập mật khẩu tạm hai lần, giao cho nhân viên qua kênh trực tiếp.
Database đánh dấu phải đổi, tăng resetVersion, thu hồi auth.sessions, ghi audit metadata
(không lưu mật khẩu); sau đó API cập nhật mật khẩu qua Supabase Auth Admin.
Nếu Auth thất bại sau đánh dấu, tài khoản vẫn bị yêu cầu đổi; admin cần thử đặt lại.
Việc thay mật khẩu Auth và cập nhật DB là hai dịch vụ, không phải một giao dịch nguyên tử.
Khi đổi mật khẩu, người dùng phải chứng minh mật khẩu hiện tại/tạm; kiểm tra resetVersion
để không xóa yêu cầu mới từ admin; kết thúc các phiên khác, giữ phiên mới.

## Phân quyền và giới hạn

API kiểm tra chữ ký JWT, session_id vẫn tồn tại, account active, role JWT khớp DB.
Nếu must_change_password, chỉ /api/auth/me và /api/auth/change-password được sử dụng.
Storage upload cũng kiểm tra phiên và cờ đổi mật khẩu; URL đã ký cũ còn dùng tối đa 5 phút.
Public login/register được rate-limit qua DB theo IP Cloudflare và username: 10/min mỗi key.
Ở local, IP key dùng chung `local`; không tin X-Forwarded-For từ client.
Production cần thêm chống bot/đăng ký spam theo chính sách công ty và dọn rate rows cũ.
Không có quyền nội bộ mặc định ngoài hồ sơ bản thân cho account mới.
Không đặt secret key trong web, không ghi password/token vào logs/audit.

## Kiểm chứng

Tests service dùng Node built-in runner, mock Supabase:
`node --test apps/api/src/modules/auth/auth.service.test.mjs apps/api/src/modules/users/users.service.test.mjs`.
Lint/typecheck/build kiểm tra riêng workspace. Migration/Google/local Auth end-to-end
chưa được kiểm thử với database thật vì project cần user chạy SQL và cấu hình secret.
Script generate-types.sh trống; chưa sinh types DB. Không tuyên bố an toàn production.
