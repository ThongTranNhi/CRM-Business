# Quy tắc Database (Supabase / Postgres)

## Migration

- KHÔNG tạo/sửa bảng bằng tay trên Supabase Table Editor. Mọi thay đổi viết migration trong repo trước, rồi mới áp lên Supabase (ADR 008).
- Trước khi tạo bảng: kiểm tra migration cũ, không tạo trùng bảng/cột đã có.

- Mọi thay đổi schema = file mới trong `supabase/migrations/` (`YYYYMMDDHHMMSS_mo_ta.sql`).
- KHÔNG sửa migration đã chạy. Sai thì viết migration mới để sửa.
- Sau khi đổi schema: chạy `scripts/generate-types.sh`. Không viết type DB bằng tay.
- Ghi lại thay đổi trong `docs/changelog/migrations.md`.

## Thiết kế bảng

- Khoá chính `id uuid default gen_random_uuid()`.
- Mọi bảng có `created_at`, `updated_at` (trigger tự cập nhật), bảng nghiệp vụ có `created_by`.
- Tham chiếu bằng khoá ngoại; không lưu tên/text thay cho id.
- Ràng buộc nghiệp vụ đặt ở DB khi có thể:
  - `department_dashboards.department_id` UNIQUE (mỗi phòng ban 1 dashboard chính).
  - `tasks.assignee_id` NOT NULL (đúng 1 người phụ trách chính).
  - `departments.name` UNIQUE không phân biệt hoa thường (index trên `lower(name)`).
- Enum trạng thái cố định dùng `check` hoặc Postgres enum; danh mục do người dùng cấu hình (loại nghỉ phép...) dùng bảng riêng.

## Xoá dữ liệu

- Không hard delete dữ liệu nghiệp vụ: dùng `archived_at` / `deleted_at`.
- `task_activities`, `audit_logs`: chỉ INSERT, không UPDATE/DELETE.

## RLS

- Bật RLS cho MỌI bảng. Không có policy = không ai đọc được qua anon key.
- API dùng service role nên RLS là lớp phòng thủ thứ 2; quyền chính vẫn ở API.
- Ghi policy vào `docs/database/rls-policies.md`.

## Hiệu năng

- Index cho cột lọc/join: `department_id`, `assignee_id`, `status`, `due_date`, `project_id`, `board_id`.
- Index ghép cho truy vấn hay dùng: `(board_id, status, position)`.
- Thứ tự card dùng cột `position` kiểu số (numeric/double) để chèn giữa không phải đánh lại toàn bộ.
- Không `select *`.
