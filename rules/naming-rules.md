# Quy tắc đặt tên

| Đối tượng             | Quy tắc                                      | Ví dụ                             |
| --------------------- | -------------------------------------------- | --------------------------------- |
| Thư mục module        | kebab-case                                   | `department-dashboards/`          |
| File React component  | PascalCase.tsx                               | `TaskCard.tsx`                    |
| File hook             | camelCase bắt đầu `use`                      | `useMoveTask.ts`                  |
| File khác (web)       | kebab-case                                   | `api-client.ts`, `task.schema.ts` |
| File API module       | `<module>.<lớp>.ts`                          | `tasks.service.ts`                |
| Component             | PascalCase                                   | `KanbanColumn`                    |
| Hàm, biến             | camelCase, động từ cho hàm                   | `moveTask`, `isOverdue`           |
| Hằng số               | UPPER_SNAKE_CASE                             | `MAX_UPLOAD_SIZE_MB`              |
| Type / interface      | PascalCase, không tiền tố `I`                | `Task`, `CreateTaskInput`         |
| Bảng DB               | snake_case số nhiều                          | `tasks`, `department_dashboards`  |
| Cột DB                | snake_case                                   | `assignee_id`, `completed_at`     |
| Khoá ngoại            | `<bảng số ít>_id`                            | `department_id`                   |
| Thời gian             | hậu tố `_at`                                 | `created_at`, `archived_at`       |
| Boolean               | `is_`, `has_`                                | `is_active`                       |
| Enum giá trị          | snake_case                                   | `todo`, `in_progress`, `done`     |
| File migration        | `YYYYMMDDHHMMSS_<đối tượng>_<thay đổi>.sql`  | `20261022090000_product_kind.sql` |
| File SQL test         | `tests/<tên migration bỏ timestamp>.sql`     | `tests/product_kind.sql`          |
| RPC Postgres          | `crm_<động từ>_<đối tượng>`                  | `crm_return_asset`                |
| Endpoint              | `/api/<module>` kebab-case, danh từ số nhiều | `/api/department-dashboards/:id`  |
| Query key React Query | mảng bắt đầu bằng tên module                 | `['tasks', boardId]`              |
| Biến môi trường web   | `VITE_` + UPPER_SNAKE                        | `VITE_API_URL`                    |

- Tên tiếng Anh trong code; chữ hiển thị tiếng Việt.
- Không viết tắt khó hiểu (`dept` ok, `dshb` không).
- File SQL: tên phải nói rõ đối tượng và việc làm, cấm `fix.sql`, `update.sql`, `temp.sql`… — chi tiết ở
  `database-rules.md` mục "Đặt tên file SQL".
