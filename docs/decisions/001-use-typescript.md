# ADR 001: Dùng TypeScript

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-05

## Bối cảnh

Cần một ngôn ngữ cho cả web và API, an toàn kiểu, dễ tuyển người và AI viết tốt. Hiệu năng của app nội bộ phụ thuộc mạng và DB nhiều hơn ngôn ngữ.

## Quyết định

TypeScript strict cho toàn repo, cấm `any`. Ghim **TypeScript 5.9** vì bản 7 chưa tương thích `typescript-eslint`.

## Hệ quả

Dùng chung type/schema giữa các lớp; type DB sinh tự động từ Supabase. Nâng TS 7 khi typescript-eslint hỗ trợ.
