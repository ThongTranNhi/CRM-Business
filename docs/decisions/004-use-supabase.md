# ADR 004: Supabase cho DB, Auth, Storage, Realtime

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-05

## Bối cảnh

Dữ liệu quan hệ (phòng ban, nhân viên, task, lương). Cần auth, lưu file, realtime cho board mà không tự dựng.

## Quyết định

Supabase, region Singapore. Mọi thao tác ghi qua API (service role). Web chỉ dùng Supabase cho auth, upload, realtime. RLS bật cho mọi bảng.

## Hệ quả

Production dùng gói Pro để có backup. Nếu công ty bắt buộc lưu dữ liệu tại Việt Nam → xem xét tự host (Postgres chuẩn, chuyển được).
