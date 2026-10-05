# ADR 003: Hono trên Cloudflare Workers cho API

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-05

## Bối cảnh

Cần backend chứa nghiệp vụ phức tạp (kéo thả, activity log, duyệt nhiều cấp, payroll), miễn phí khi bắt đầu, không ngủ, không quản lý server.

## Quyết định

Hono chạy trên Cloudflare Workers. Kiến trúc module: routes → controller → service → repository. Xác thực JWT bằng jose (JWKS).

## Hệ quả

Không có Node API đầy đủ (cấm thư viện cần fs/net). CPU mỗi request giới hạn ở gói free → việc nặng phải tách riêng. DB ở Singapore nên giảm số lần gọi DB mỗi request.
