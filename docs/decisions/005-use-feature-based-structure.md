# ADR 005: Cấu trúc theo tính năng (feature-based)

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-05

## Bối cảnh

Hệ thống có ~25 module. Chia theo loại file (components/, services/...) làm code một tính năng nằm rải rác.

## Quyết định

Web: `features/<module>/{api,hooks,components,pages,schemas}`. API: `modules/<module>/<module>.{routes,controller,service,repository,schema,types}.ts`. Dùng chung đặt ở `components/ui` và `lib/`. Chi tiết: `rules/architecture-rules.md`.

## Hệ quả

Cấm `src/pages`, `src/services`, `src/utils`, `packages/`. Module chỉ import nhau qua `index.ts` (web) hoặc service (api).
