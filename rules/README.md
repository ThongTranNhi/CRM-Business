# Quy tắc phát triển

`rules/` là **nguồn chính thức**. `CLAUDE.md`, `AGENTS.md`, `.claude/rules/`, `.cursor/rules/` chỉ tóm tắt và trỏ về đây.
Khi quy tắc thay đổi: sửa ở đây trước, rồi cập nhật bản tóm tắt.

| File                                           | Nội dung                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------- |
| [code-quality-rules.md](code-quality-rules.md) | **Từng file chỉn chu, tinh gọn**: giới hạn kích thước, mẫu chuẩn, checklist trước commit |
| [architecture-rules.md](architecture-rules.md) | Cấu trúc thư mục, ranh giới module, tên module                                           |
| [naming-rules.md](naming-rules.md)             | Đặt tên file, biến, component, bảng, endpoint                                            |
| [frontend-rules.md](frontend-rules.md)         | React, React Query, form, trạng thái màn hình                                            |
| [backend-rules.md](backend-rules.md)           | Hono, luồng routes → service → repository                                                |
| [api-rules.md](api-rules.md)                   | Thiết kế endpoint, response, lỗi, phân trang                                             |
| [database-rules.md](database-rules.md)         | Migration, khoá ngoại, RLS, soft delete, index                                           |
| [security-rules.md](security-rules.md)         | Xác thực, phân quyền, secret, dữ liệu nhạy cảm                                           |
| [ui-ux-rules.md](ui-ux-rules.md)               | Màu, layout, component, trạng thái, responsive                                           |
| [testing-rules.md](testing-rules.md)           | Test gì, ở đâu, khi nào                                                                  |
| [git-rules.md](git-rules.md)                   | Branch, commit, PR                                                                       |
| [ai-rules.md](ai-rules.md)                     | Cách AI agent nhận việc, làm việc và báo cáo                                             |
