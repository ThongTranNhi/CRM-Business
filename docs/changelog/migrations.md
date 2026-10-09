# Migration

## Cách áp (SQL Editor của Supabase)

Chạy **đúng thứ tự** dưới đây, mỗi lần dán **nguyên một file**. Mỗi file mới (từ 20261006…) bọc trong
`begin; … commit;` — lỗi giữa chừng thì không thay đổi gì. File mới kiểm tra file trước đã chạy chưa;
chưa thì dừng với thông báo `Chạy <tên file> trước`. Lỡ chạy lại một file đã chạy không làm hỏng dữ liệu.

| #   | File                                                  | Ngày chạy (chủ dự án điền) |
| --- | ----------------------------------------------------- | -------------------------- |
| 1   | `20261005120000_employee_directory.sql`               | 06/10/2026                 |
| 2   | `20261005160000_registration_profiles.sql`            | 06/10/2026                 |
| 3   | `20261005200000_username_admin_directory.sql`         | 06/10/2026                 |
| 4   | `20261005210000_sync_local_usernames.sql`             | 06/10/2026                 |
| 5   | `20261006090000_migration_tracking.sql`               | 06/10/2026                 |
| 6   | `20261006090100_departments_optional_manager.sql`     | 06/10/2026                 |
| 7   | `20261006090200_department_management_rpcs.sql`       | 06/10/2026                 |
| 8   | `20261006090300_employee_soft_delete.sql`             | 06/10/2026                 |
| 9   | `20261006090400_employee_restore_previous_status.sql` | 06/10/2026                 |
| 10  | `20261006090500_super_admin_titles.sql`               | 06/10/2026                 |
| 11  | `20261006090600_work_management_tables.sql`           | 06/10/2026                 |
| 12  | `20261006090700_work_management_rpcs.sql`             | 06/10/2026                 |
| 13  | `20261006090800_employee_delete_handover.sql`         | 06/10/2026                 |
| 14  | `20261007090000_task_restore.sql`                     | 07/10/2026                 |
| 15  | `20261007100000_task_trash.sql`                       | 07/10/2026                 |
| 16  | `20261008090000_handover_writable_boards.sql`         | 08/10/2026                 |
| 17  | `20261009090000_projects.sql`                         | 09/10/2026                 |
| 18  | `20261010090000_projects_review_fixes.sql`            |                            |

Sau đó (chỉ môi trường dev): `supabase/seed.sql`, rồi chạy kiểm tra `supabase/tests/soft_delete_views.sql`
`supabase/tests/employee_restore_status.sql` và `supabase/tests/work_management_rpcs.sql`, `supabase/tests/task_restore.sql`, `supabase/tests/task_trash.sql`, `supabase/tests/projects.sql`, `supabase/tests/projects_review_fixes.sql` (tự ROLLBACK, thấy
thông báo `soft_delete_views: đạt`, `employee_restore_status: đạt`, `work_management_rpcs: đạt`, `task_restore: đạt`, `task_trash: đạt`, `projects: đạt`, `projects_review_fixes: đạt` là đúng).

Xem migration đã chạy:

```sql
select name, applied_at from app_private.applied_migrations order by name;
```

## Nhật ký

- `20261010090000_projects_review_fixes.sql` (sửa theo review S1): `crm_update_project` — đổi chủ làm chủ mới tự
  vào `project_members` thì ghi audit `project.members` (cũ → mới); `app_private.crm_assert_task_project` đọc dự án
  `FOR SHARE` để không gắn task vào dự án đang bị lưu trữ ở giao dịch khác. Chỉ thay thân hàm. Kiểm tra:
  `supabase/tests/projects_review_fixes.sql` (cuối file có cách thử tay FOR SHARE bằng hai phiên).
- `20261009090000_projects.sql` (Đợt 3 S1, BR-30, BR-31): bảng `projects` (tên không trùng trong phòng khi chưa
  lưu trữ), `project_members` (Q6); khoá ngoại ghép `tasks(project_id, department_id)` → `projects(id,
department_id)`; view `project_summaries` (tiến độ, quá hạn, số thành viên — 1 truy vấn),
  `project_activity_feed` (audit dự án); `task_cards` thêm `project_id`, `project_name`; RPC
  `crm_create_project`, `crm_update_project`, `crm_set_project_members`, `crm_archive_project`,
  `crm_restore_project` (ghi audit); `crm_create_task` thêm `project_uuid` (DROP chữ ký cũ), `crm_update_task`
  nhận khoá `projectId` và ghi activity `project_changed`. Kiểm tra: `supabase/tests/projects.sql`.
- `20261008090000_handover_writable_boards.sql` (sửa review L6, BR-53): view `open_assigned_tasks` — việc
  đang mở trên Dashboard còn ghi được (bỏ phòng đã xoá, BR-06), dùng cho số đếm và bàn giao; người nhận
  không thuộc board → lỗi kèm danh sách việc / Dashboard bị chặn (`detail` JSON); `crm_delete_employee`
  trả `{ openTaskCount, handedOverTaskCount }`. Kiểm tra: `supabase/tests/employee_handover.sql`.
- `20261007100000_task_trash.sql`: thùng rác công việc — view `task_trash` (việc đã xoá kèm cột cũ, người phụ
  trách, người xoá; chỉ `service_role`) cho `GET /api/boards/:boardId/trash`; index
  `tasks_board_archived_idx`. Không đổi dữ liệu.
- `20261007090000_task_restore.sql`: hoàn tác xoá công việc — RPC `crm_restore_task` (về cuối cột cũ, activity
  `restored`, audit `task.restore`); `crm_work_access` thấy task đã lưu trữ (`isArchived`); view `task_cards` thêm
  `created_by` (quyền xoá từng thẻ).
- `20261006090800_employee_delete_handover.sql`: `crm_delete_employee` thêm tham số tuỳ chọn
  `handover_employee_uuid` (BR-53) — chuyển việc đang mở sang người nhận (phải thuộc board của từng việc),
  ghi activity `assignee_changed`, audit ghi `handoverEmployeeId`, `handedOverTaskCount`.
- `20261006090700_work_management_rpcs.sql`: RPC tạo Dashboard + board + 3 cột mặc định (BR-04, BR-10), tạo /
  sửa / kéo thả theo cột / lưu trữ task, người phối hợp, checklist, bình luận trả lời 1 cấp (BR-11 → BR-14, BR-19); `crm_work_access` (dữ liệu để API
  kiểm tra quyền), `crm_list_dashboards` (BR-03, BR-41). Mỗi thao tác ghi `task_activities` cùng giao dịch.
- `20261006090600_work_management_tables.sql`: bảng `department_dashboards`, `boards`, `board_columns`,
  `board_members`, `tasks` (khoá ngoại ghép cột ↔ nhóm trạng thái), `task_collaborators`, `task_checklist_items`,
  `task_comments` (`parent_id`), `task_activities` (chỉ INSERT); view `dashboard_summaries`, `task_cards`, `account_profiles`, `task_activity_feed`,
  `task_comment_feed`.
- `20261006090500_super_admin_titles.sql`: cột `super_admin_allowlist.title` — nhãn hiển thị CEO
  (`jathong0107@gmail.com`) / Master (`thongtran2446@gmail.com`); `crm_session_context` trả thêm `adminTitle`
  (chỉ với `super_admin`). Không đổi quyền.
- `20261006090400_employee_restore_previous_status.sql`: khôi phục nhân viên trả tài khoản về trạng thái
  trước khi xoá (khoá trước khi xoá thì vẫn khoá) thay vì luôn `active`. `crm_delete_employee` lưu
  `previousAccountStatus` vào audit `employee.delete`; `crm_restore_employee` đọc audit gần nhất, không có thì
  `active`, và ghi `restoredAccountStatus` vào audit `employee.restore`.
- `20261006090300_employee_soft_delete.sql`: xoá / khôi phục nhân viên (BR-53) bằng RPC — khoá tài khoản,
  thu hồi phiên, gỡ chức trưởng phòng, audit; mã nhân viên chỉ unique giữa người chưa xoá; view
  `employee_directory`, `active_employees`.
- `20261006090200_department_management_rpcs.sql`: RPC tạo / sửa / chuyển nhân viên / xoá mềm (BR-09,
  chuyển toàn bộ nhân viên sang phòng nhận) / khôi phục phòng ban; thay `crm_admin_update_employee` để
  đổi phòng của trưởng phòng không còn lỗi khoá ngoại.
- `20261006090100_departments_optional_manager.sql`: trưởng phòng tuỳ chọn (BR-08); tên phòng unique
  chỉ giữa phòng chưa xoá; view `active_departments`.
- `20261006090000_migration_tracking.sql`: bảng `app_private.applied_migrations`, ghi nhận 4 migration cũ.

- `20261005210000_sync_local_usernames.sql`: sửa username map khi Auth Admin ghi
  app_metadata sau INSERT, backfill account cũ và RPC kiểm tra username đã tồn tại.

- `20261005200000_username_admin_directory.sql`: username và đăng ký không SMTP,
  phiên đăng nhập có thể thu hồi, bắt buộc đổi mật khẩu tạm, rate limit bền vững,
  RPC quản trị hồ sơ và reset có audit.

- `20261005160000_registration_profiles.sql`: mã nhân viên/chức vụ nullable,
  avatar_path, trigger tạo hồ sơ employee khi signup, backfill giữ quyền cũ,
  private Storage bucket/policy và RPC cập nhật hồ sơ có audit actor.

- `20261005120000_employee_directory.sql`: hồ sơ tối giản, mã nhân viên unique,
  phòng ban với một trưởng phòng cùng phòng, 5 vai trò hệ thống, trạng thái tài khoản,
  audit bất biến, RLS mặc định từ chối và cấp super_admin cho hai Google identity
  được allowlist.
