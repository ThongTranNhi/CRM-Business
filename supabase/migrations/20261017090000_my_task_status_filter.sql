-- Đợt 4 S2 — Tổng quan cá nhân (/app) + lọc trạng thái ở Việc của tôi.
-- - View my_task_rows: giữ nguyên các cột cũ, thêm cờ is_done_this_week (xong từ Thứ Hai tuần này, giờ Việt Nam) và
--   is_due_soon (chưa xong, hạn từ hôm nay tới 6 ngày sau — 7 ngày tính cả hôm nay).
-- - crm_my_task_counts: thêm bộ lọc task_status / done_this_week (áp vào MỌI số đếm như các bộ lọc cũ) và trả thêm
--   todo, in_progress, done_this_week cho 4 thẻ Tổng quan. Bỏ chữ ký 5 tham số; API cũ (gọi bằng tên 5 tham số) vẫn
--   chạy vì tham số mới có mặc định.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261016090000_workload.sql') then
    raise exception 'Chạy 20261016090000_workload.sql trước';
  end if;
end;
$$;

create or replace view public.my_task_rows with (security_invoker = true) as
with vn as (
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date as today,
    date_trunc('week', (now() at time zone 'Asia/Ho_Chi_Minh'))::date as week_start
), involved as (
  -- Điều kiện employee_id được đẩy xuống từng nhánh → dùng tasks_assignee_idx / task_collaborators_employee_idx.
  select t.id as task_id, t.assignee_id as employee_id, true as is_assignee
  from public.tasks t where t.archived_at is null
  union all
  select c.task_id, c.employee_id, false from public.task_collaborators c
)
select x.employee_id, x.is_assignee,
  t.id, t.board_id, t.column_id, t.title, t.status, t.priority, t.due_date, t.completed_at, t.created_by,
  t.department_id, d.name as department_name, dd.id as dashboard_id, dd.name as dashboard_name,
  t.project_id, pr.name as project_name,
  (select count(*) from public.task_checklist_items i
    where i.task_id = t.id and i.deleted_at is null)::int as checklist_total,
  (select count(*) from public.task_checklist_items i
    where i.task_id = t.id and i.deleted_at is null and i.is_done)::int as checklist_done,
  -- Cột mặc định nhóm "done" của board: đích của checkbox hoàn thành nhanh.
  (select bc.id from public.board_columns bc
    where bc.board_id = t.board_id and bc.status = 'done' and bc.is_default) as done_column_id,
  e.department_id = t.department_id as is_department_member,
  exists (select 1 from public.board_members m
    where m.board_id = t.board_id and m.employee_id = x.employee_id) as is_board_member,
  d.manager_employee_id is not distinct from x.employee_id as is_department_manager,
  t.status <> 'done' and t.due_date < vn.today as is_overdue,
  t.status <> 'done' and t.due_date = vn.today as is_due_today,
  t.status <> 'done' and t.due_date between vn.week_start and vn.week_start + 6 as is_due_this_week,
  -- Cột mới (Đợt 4 S2) — chỉ được thêm ở cuối view.
  t.status = 'done' and t.completed_at >= (vn.week_start::timestamp at time zone 'Asia/Ho_Chi_Minh')
    as is_done_this_week,
  t.status <> 'done' and t.due_date between vn.today and vn.today + 6 as is_due_soon
from involved x
join public.tasks t on t.id = x.task_id and t.archived_at is null
join public.employees e on e.id = x.employee_id
join public.departments d on d.id = t.department_id and d.archived_at is null
join public.boards b on b.id = t.board_id
join public.department_dashboards dd on dd.id = b.dashboard_id
left join public.projects pr on pr.id = t.project_id
cross join vn
where e.department_id = t.department_id
  or exists (select 1 from public.board_members m
    where m.board_id = t.board_id and m.employee_id = x.employee_id);

drop function if exists public.crm_my_task_counts(uuid, uuid, text, uuid, text);

-- Số việc từng tab + 3 số của thẻ Tổng quan với cùng bộ lọc của danh sách. `search` đã escape % và _ ở API
-- (searchSchema) — LIKE dùng \ làm ký tự escape mặc định.
create function public.crm_my_task_counts(
  employee_uuid uuid, department_uuid uuid default null, task_priority text default null,
  project_uuid uuid default null, search text default null, task_status text default null,
  done_this_week boolean default false
) returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'today', count(*) filter (where r.is_due_today),
    'week', count(*) filter (where r.is_due_this_week),
    'overdue', count(*) filter (where r.is_overdue),
    'open', count(*) filter (where r.status <> 'done'),
    'done', count(*) filter (where r.status = 'done'),
    'todo', count(*) filter (where r.status = 'todo'),
    'in_progress', count(*) filter (where r.status = 'in_progress'),
    'done_this_week', count(*) filter (where r.is_done_this_week))
  from public.my_task_rows r
  where r.employee_id = employee_uuid
    and (department_uuid is null or r.department_id = department_uuid)
    and (task_priority is null or r.priority = task_priority)
    and (project_uuid is null or r.project_id = project_uuid)
    and (search is null or r.title ilike '%' || search || '%')
    and (task_status is null or r.status = task_status)
    and (not done_this_week or r.is_done_this_week);
$$;

revoke all on public.my_task_rows from public, anon, authenticated;
grant select on public.my_task_rows to service_role;
revoke all on function public.crm_my_task_counts(uuid, uuid, text, uuid, text, text, boolean)
  from public, anon, authenticated;
grant execute on function public.crm_my_task_counts(uuid, uuid, text, uuid, text, text, boolean)
  to service_role;

insert into app_private.applied_migrations (name)
values ('20261017090000_my_task_status_filter.sql')
on conflict (name) do nothing;

commit;
