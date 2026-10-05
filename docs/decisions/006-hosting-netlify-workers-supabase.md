# ADR 006: Hạ tầng Netlify + Cloudflare Workers + Supabase

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-05

## Bối cảnh

Cần hạ tầng miễn phí khi phát triển, ổn định khi chạy thật, độ trễ thấp cho người dùng Việt Nam.

## Quyết định

Web: Netlify. API: Cloudflare Workers. DB: Supabase Singapore. Công cụ: pnpm 10.18 (bản 12 chưa chạy với corepack hiện tại).

## Hệ quả

Chi phí dev 0đ. Production: nên trả Supabase Pro trước; Workers Paid khi cần CPU nhiều hơn. Thay đổi hosting phải có ADR mới.
