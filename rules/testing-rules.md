# Quy tắc kiểm thử

- **Bắt buộc** test cho `*.service.ts` (nghiệp vụ) — đặc biệt các quy tắc cốt lõi:
  không tạo trùng dashboard, đúng 1 người phụ trách, move task ghi completed_at/by, quyền.
- Hàm thuần ở web (tính overdue, tiến độ checklist) có unit test.
- Test đặt cạnh file: `tasks.service.test.ts`.
- Repository/DB: mock trong unit test; test tích hợp dùng Supabase local khi có.
- Lỗi được sửa → thêm test tái hiện lỗi.
- Trước khi báo xong: `pnpm lint`, `pnpm typecheck` (và `pnpm test` khi đã có test) đều pass.
- Chưa cài test runner; khi viết test đầu tiên → HỎI để thêm (đề xuất Vitest).
