# Quy tắc Database (Supabase / Postgres)

## Migration

- KHÔNG tạo/sửa bảng bằng tay trên Supabase Table Editor. Mọi thay đổi viết migration trong repo trước, rồi mới áp lên Supabase (ADR 008).
- Trước khi tạo bảng: kiểm tra migration cũ, không tạo trùng bảng/cột đã có.

- Mọi thay đổi schema = file mới trong `supabase/migrations/` (`YYYYMMDDHHMMSS_mo_ta.sql`), đặt tên theo mục
  "Đặt tên file SQL" bên dưới.
- KHÔNG sửa migration đã chạy. Sai thì viết migration mới để sửa.
- Sau khi đổi schema: chạy `scripts/generate-types.sh`. Không viết type DB bằng tay.
- Ghi lại thay đổi trong `docs/changelog/migrations.md`.

## Đặt tên file SQL — đọc tên là biết dùng cho việc gì

Người mở thư mục `supabase/migrations/` hay SQL Editor phải đoán đúng file làm gì mà không cần mở ra đọc.

- **Migration**: `YYYYMMDDHHMMSS_<đối tượng>_<thay đổi>.sql`, snake_case, tiếng Anh không dấu, 2–6 từ.
  - `<đối tượng>`: bảng / tính năng bị đổi, dùng đúng tên module (`naming-rules.md`): `tasks`, `task_links`,
    `issued_assets`, `employees`…
  - `<thay đổi>`: việc migration làm — danh từ hoặc động từ cụ thể: `kind`, `status_filter`, `soft_delete`,
    `owner_handover`, `add_due_reminder`, `drop_legacy_view`…
  - Đúng: `20261022090000_product_kind.sql`, `20261007090000_task_restore.sql`,
    `20261012090000_project_owner_handover.sql`, `20261104090000_task_links.sql`.
  - **Cấm** tên chung chung hoặc không có đối tượng: `fix.sql`, `update.sql`, `changes.sql`, `new_table.sql`,
    `temp.sql`, `test.sql`, `misc.sql`, `v2.sql`, `final.sql`, `migration.sql`, `patch_1.sql`, tên người, tên đợt
    (`dot_4.sql`), số ticket một mình.
  - Migration sửa lỗi của migration trước: nêu đối tượng và cái được sửa, không chỉ ghi "fix" —
    `..._tasks_due_date_check_fix.sql`, không `..._fix_bug.sql` hay `..._review_fixes.sql`.
  - Timestamp lấy giờ tạo file, tăng dần, không trùng; hai migration cùng ngày thì cách nhau ít nhất 1 phút.
- **SQL test**: `supabase/tests/<tên migration bỏ timestamp>.sql` (vd. `tests/task_links.sql` cho
  `20261104090000_task_links.sql`); thông báo khi đạt là `<tên đó>: đạt`.
- **Seed / script dùng một lần**: không để trong `migrations/`. Seed ở `supabase/seed.sql`; script khác ghi rõ việc và
  môi trường trong tên (`seed_demo_departments.sql`), không `script1.sql`.
- **Dòng đầu mỗi file**: comment 1–3 dòng nói file làm gì, cho tính năng nào (vd. `-- Link kết quả của task`).
  Tên ngắn, comment giải thích thêm.
- **Không đổi tên** migration đã áp lên bất kỳ môi trường nào: tên nằm trong `app_private.applied_migrations` và
  các file sau kiểm tra theo tên. File cũ chưa khớp rule (vd. `20261010090000_projects_review_fixes.sql`,
  `tests/soft_delete_views.sql`) giữ nguyên; rule áp dụng cho file tạo từ 04/11/2026.
- **Object trong SQL** cũng phải tự nói việc của nó:
  - RPC: `crm_<động từ>_<đối tượng>` — `crm_create_issued_asset`, `crm_return_asset`.
  - Hàm nội bộ (`app_private`): `crm_<động từ>_<đối tượng>` hoặc `crm_assert_…`, `crm_lock_…`, `crm_log_…`.
  - View: `<đối tượng>_summaries` (danh sách), `<đối tượng>_rows` (dòng chi tiết), hoặc tên nói rõ nội dung
    (`upcoming_task_rows`).
  - Constraint / index: `<bảng>_<cột>_check`, `<bảng>_<cột>_key`, `<bảng>_<cột>_idx` — API map tên constraint
    sang mã lỗi (`*.errors.ts`), nên không để Postgres tự đặt.

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
