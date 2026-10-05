# Quy tắc bảo mật

## Xác thực

- Đăng nhập bằng Supabase Auth. API xác thực JWT qua JWKS của Supabase (`auth.middleware`, thư viện `jose`).
- Role đọc từ `app_metadata.role` (chỉ server sửa được). CẤM dùng `user_metadata` cho quyền.

## Phân quyền

- Mọi endpoint (trừ `/api/health`, POST `/api/auth/register`, POST `/api/auth/login`) yêu cầu đăng nhập.
- Đăng ký/đăng nhập username công khai có rate limit; tài khoản mới chỉ role employee.
- JWT phải gắn với phiên auth.sessions còn hiệu lực; mật khẩu tạm buộc đổi trước khi dùng API nghiệp vụ.
- Kiểm tra quyền ở backend: middleware theo role + service theo dữ liệu.
- Mặc định từ chối: không có quyền rõ ràng = 403.
- Ma trận quyền: `docs/architecture/permission-model.md`.

## Secret

- `SUPABASE_SERVICE_ROLE_KEY` chỉ ở API (`wrangler secret` / `.dev.vars`). Không bao giờ ở web, không commit, không dán vào chat.
- `.env*`, `.dev.vars` nằm trong `.gitignore`.

## Dữ liệu nhạy cảm (lương, CCCD, địa chỉ, ngày sinh, hợp đồng)

- Chỉ trả về khi người gọi đủ quyền; ẩn trường thay vì trả cả bản ghi.
- Không ghi dữ liệu nhạy cảm vào log.
- Mọi thay đổi → `audit_logs` (user, action, resource, giá trị cũ, mới, thời gian).

## File

- Upload qua Supabase Storage, bucket private, truy cập bằng signed URL có hạn.
- Giới hạn loại file và dung lượng; kiểm tra quyền trước khi cấp URL.

## Khác

- Validate mọi input ở API. Không ghép chuỗi SQL.
- CORS chỉ cho phép origin trong `ALLOWED_ORIGINS`.
- Không lộ chi tiết lỗi nội bộ ra response.
