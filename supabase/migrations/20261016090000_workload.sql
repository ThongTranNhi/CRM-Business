-- Đợt 4 S1 — Khối lượng việc (/app/workload, frontend-spec 4.6).
-- View employee_workload: mỗi nhân viên chưa xoá một dòng, đếm việc người đó là người PHỤ TRÁCH CHÍNH trên mọi
-- Dashboard (kể cả phòng được mời; không cộng việc phối hợp). Bỏ task đã lưu trữ và task của phòng đã xoá.
-- Quá hạn và "Xong 30 ngày" tính theo ngày Việt Nam. Chỉ service_role đọc; phạm vi phòng ban do API lọc.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261013090000_notifications.sql') then
    raise exception 'Chạy 20261013090000_notifications.sql trước';
  end if;
end;
$$;

create or replace view public.employee_workload with (security_invoker = true) as
with vn as (
  select (now() at time zone 'Asia/Ho_Chi_Minh')::date as today
), assigned as (
  select t.assignee_id, t.status, t.due_date, t.completed_at
  from public.tasks t
  join public.departments td on td.id = t.department_id and td.archived_at is null
  where t.archived_at is null
)
select e.id as employee_id, e.full_name, e.department_id, d.name as department_name,
  -- Board phòng của nhân viên: đích khi bấm một con số (null → phòng chưa có Dashboard).
  dd.id as dashboard_id,
  count(a.assignee_id) filter (where a.status = 'todo')::int as todo_count,
  count(a.assignee_id) filter (where a.status = 'in_progress')::int as in_progress_count,
  count(a.assignee_id) filter (where a.status <> 'done')::int as open_count,
  count(a.assignee_id) filter (where a.status <> 'done' and a.due_date < vn.today)::int as overdue_count,
  count(a.assignee_id) filter (where a.status = 'done'
    and (a.completed_at at time zone 'Asia/Ho_Chi_Minh')::date > vn.today - 30)::int as done_30d_count
from public.employees e
left join public.departments d on d.id = e.department_id
left join public.department_dashboards dd on dd.department_id = e.department_id
left join assigned a on a.assignee_id = e.id
cross join vn
where e.archived_at is null
-- department_id nằm trong GROUP BY để bộ lọc phòng ban của API được đẩy xuống trước khi gộp.
group by e.id, e.department_id, d.id, dd.id, vn.today;

revoke all on public.employee_workload from public, anon, authenticated;
grant select on public.employee_workload to service_role;

insert into app_private.applied_migrations (name)
values ('20261016090000_workload.sql')
on conflict (name) do nothing;

commit;
