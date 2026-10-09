# Database hồ sơ nhân viên

Thứ tự chạy migration và câu kiểm tra: [docs/changelog/migrations.md](../changelog/migrations.md).

## Work Management (Đợt 2 — migration 20261006090600 → 090800)

- Người phụ trách (`tasks.assignee_id`, NOT NULL — BR-12), người phối hợp (`task_collaborators.employee_id`),
  thành viên board (`board_members.employee_id`) → `employees`. Người tạo, người hoàn thành, người thao tác
  (`created_by`, `completed_by`, `task_activities.actor_id`, `task_comments.author_id`) → `app_accounts`.
- `department_dashboards.department_id` UNIQUE (BR-04); `boards.dashboard_id` UNIQUE (1 board / Dashboard).
- `board_columns` kiểu Trello: `status` là nhóm trạng thái của cột; `is_default` đánh dấu 3 cột mặc định
  (BR-10). Unique `(board_id, position)`; partial unique `(board_id, status) where is_default`; unique
  `(id, board_id, status)` làm đích khoá ngoại ghép. Đợt 2 không có thêm / sửa / xoá cột.
- `tasks.column_id` NOT NULL, khoá ngoại ghép `tasks_column_status_fk (column_id, board_id, status) →
board_columns(id, board_id, status)`: cột cùng board và status luôn khớp nhóm của cột.
- `task_comments.parent_id` → `task_comments` (trả lời 1 cấp, `crm_add_comment` chặn trả lời vào trả lời).
- `tasks`: `status`, `priority` dùng `check`; `position numeric` (thứ tự trong cột); `project_id` chưa có
  khoá ngoại (Đợt 3). Check có tên cố định để API map lỗi: `tasks_title_check`, `tasks_description_check`,
  `tasks_date_range_check`, `tasks_done_completed_at_check`, `tasks_completed_by_check` (BR-14),
  `task_checklist_items_content_check`, `task_comments_body_check`.
  Index `(column_id, position)` và `(board_id, status)` cho task chưa lưu trữ, `assignee_id`, `department_id`,
  `due_date`.
- Trigger: `updated_at` (`app_private.set_updated_at`) cho mọi bảng; chặn người phụ trách làm người phối
  hợp; `task_activities` chỉ INSERT (BR-21).
- Xoá mềm: `tasks.archived_at` (BR-19), `task_checklist_items.deleted_at`.
- View đọc: `dashboard_summaries` (số việc đang mở / đang làm / quá hạn theo giờ Việt Nam — BR-16),
  `task_cards` (thẻ trên board: người phụ trách, `collaborators` jsonb `[{id, name, avatarPath}]`, số
  checklist, số bình luận), `account_profiles`,
  `task_activity_feed`, `task_comment_feed`.
- RPC (chỉ `service_role` EXECUTE): `crm_work_access`, `crm_list_dashboards`, `crm_create_dashboard`,
  `crm_create_task`, `crm_move_task`, `crm_update_task`, `crm_set_task_collaborators`,
  `crm_add_checklist_item`, `crm_update_checklist_item`, `crm_remove_checklist_item`, `crm_add_comment`,
  `crm_archive_task`;
  `crm_delete_employee` thêm `handover_employee_uuid` (người nhận phải thuộc board của từng việc bàn giao,
  sai → `HANDOVER_EMPLOYEE_NOT_IN_BOARD`). `crm_create_task` nhận cả ngày bắt đầu và người phối hợp.
  Phân quyền theo dữ liệu nằm ở API; RPC kiểm tra tài khoản còn hoạt động, phòng chưa xoá (BR-06) và
  người được giao / người phối hợp **mới thêm** thuộc phòng / board (người phối hợp cũ đã chuyển phòng vẫn
  giữ hoặc gỡ được).
- Migration `20261007090000_task_restore.sql`: `crm_restore_task` (hoàn tác xoá, task về cuối cột cũ); activity
  `restored`; `crm_work_access` trả thêm `isArchived`; `task_cards` thêm `created_by`.
- Migration `20261007100000_task_trash.sql`: view `task_trash` (task đã lưu trữ + `board_id`, `created_by`, tên
  cột cũ, người phụ trách, người xoá theo activity `archived` mới nhất — một truy vấn, chỉ `service_role`);
  index `tasks_board_archived_idx (board_id, archived_at desc) where archived_at is not null`.
- Migration `20261011090000_my_tasks.sql` (Đợt 3 S2): view `my_task_rows` (employee_id, is_assignee, cột task,
  department / dashboard / project, checklist_total / done, done_column_id, is_department_member, is_board_member,
  is_department_manager, is_overdue / is_due_today / is_due_this_week) và RPC `crm_my_task_counts(employee_uuid,
department_uuid, task_priority, project_uuid, search)` → jsonb `{ today, week, overdue, open, done }`. Dùng index
  có sẵn `tasks_assignee_idx`, `task_collaborators_employee_idx`.
- Migration `20261009090000_projects.sql` (Đợt 3 S1): `projects` (department_id, name, description,
  owner_employee_id, status `planning|active|on_hold|done`, start_date, due_date, archived_at, created_by;
  unique `(department_id, lower(name))` khi chưa lưu trữ; unique `(id, department_id)` làm đích khoá ngoại ghép),
  `project_members (project_id, employee_id)`. `tasks.project_id` có khoá ngoại ghép
  `tasks_project_department_fk (project_id, department_id)` → task chỉ gắn dự án cùng phòng (BR-30). View
  `project_summaries` (task_total / task_done / task_overdue theo giờ Việt Nam, member_count, dashboard_id,
  board_id), `project_activity_feed` (audit_logs `resource_type = 'projects'`). Activity task thêm
  `project_changed`. RLS bật, chỉ `service_role` đọc; ghi qua RPC.
- Kiểm tra bằng database thật: `supabase/tests/work_management_rpcs.sql`, `supabase/tests/task_restore.sql`,
  `supabase/tests/task_trash.sql` (tự ROLLBACK).

## Phòng ban, xoá mềm, view đọc (Đợt 1 — 2026-10-06)

- `app_private.applied_migrations(name, applied_at)`: migration đã áp bằng SQL Editor. Mỗi migration mới
  kiểm tra file trước đã có trong bảng, cuối file tự ghi tên mình (migration 20261006090000).
- `departments.manager_employee_id` cho phép NULL = "Chưa có trưởng phòng" (BR-08). Khoá ngoại
  `(manager_employee_id, id) → employees(id, department_id)` giữ nguyên: có trưởng phòng thì người đó thuộc phòng.
- Tên phòng ban unique theo `lower(name)` **chỉ với phòng chưa xoá** (`departments_active_name_unique`),
  để tên phòng đã xoá được dùng lại (BR-09). Mã nhân viên tương tự (`employees_active_code_unique`).
- Xoá = xoá mềm: `departments.archived_at`, `employees.archived_at` (BR-09, BR-53, BR-55). Xoá nhân viên
  đồng thời đặt `app_accounts.status = 'disabled'` và xoá `auth.sessions`; trạng thái cũ lưu ở audit
  `employee.delete` (`new_values.previousAccountStatus`) để khôi phục trả về đúng trạng thái đó.
- View đọc (security_invoker, chỉ `service_role` được SELECT):
  - `active_departments`: phòng chưa xoá + `manager_name`, `member_count` (người chưa xoá).
  - `employee_directory`: mọi hồ sơ + phòng ban, trưởng phòng, tài khoản, `is_locked`, `archived_at`.
  - `active_employees`: `employee_directory` bỏ người đã xoá. Danh sách, ô chọn người, thành viên
    phòng và `/api/auth/me` đọc view này.
- RPC (chỉ `service_role` EXECUTE): `crm_create_department`, `crm_update_department`, `crm_move_employee`,
  `crm_delete_department`, `crm_restore_department`, `crm_delete_employee`, `crm_restore_employee`;
  `crm_admin_update_employee` được thay để đổi phòng của trưởng phòng không còn lỗi khoá ngoại.
  Hàm nội bộ trong `app_private`: `crm_actor`, `crm_lock_active_department`,
  `crm_assert_department_name_free`, `crm_assign_manager`.
- Kiểm tra bằng database thật: `supabase/tests/soft_delete_views.sql` (tự ROLLBACK).

## Trước Đợt 1

Migration `20261005210000_sync_local_usernames.sql`: đồng bộ username từ app_metadata
server-controlled sau INSERT/UPDATE Auth; backfill username NULL, giữ nguyên mật khẩu,
role và hồ sơ. Nếu tồn tại metadata trùng username, migration dừng để tránh chọn nhầm owner.

Migration `20261005200000_username_admin_directory.sql`: app_accounts.username unique,
must_change_password, password_reset_version; session gate, rate limits và RPC quản trị.
Xem [kích hoạt username/admin](../development/username-admin-setup.md).

Xem [thiết lập và cột dữ liệu](employee-directory-setup.md).
Migration `20261005120000_employee_directory.sql`: app_accounts, departments,
employees, audit_logs và allowlist quản trị trong schema app_private. Cột `super_admin_allowlist.title`
(migration `20261006090500`) là nhãn hiển thị CEO / Master, `crm_session_context` trả về `adminTitle`.

Migration `20261005160000_registration_profiles.sql` cho phép employee_code/job_title
NULL, thêm avatar_path và trigger hồ sơ cho Auth signup. Xem [đăng ký và Storage](registration-profile-setup.md).
