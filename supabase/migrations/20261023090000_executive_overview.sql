-- Đợt 4 — Tổng quan điều hành (/app/overview, frontend-spec 4.7; chủ dự án chốt 22/10/2026).
-- - Hàm crm_executive_task_stats: đếm việc theo phòng cho việc TẠO trong kỳ (tuần / tháng / quý này, ngày Việt Nam).
--   Bỏ task đã lưu trữ và task của phòng đã xoá; quá hạn = chưa xong, hạn trước hôm nay.
-- - View upcoming_task_rows: việc chưa xong có hạn, kèm phòng, Dashboard, người phụ trách và số ngày còn lại — API
--   lấy "Hạn chót 7 ngày tới". Không có bảng mới; phạm vi phòng (Trưởng phòng chỉ phòng mình) do API lọc.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261022090000_product_kind.sql') then
    raise exception 'Chạy 20261022090000_product_kind.sql trước';
  end if;
end;
$$;

-- Ngày đầu kỳ theo giờ Việt Nam: tuần bắt đầu Thứ Hai.
create or replace function app_private.crm_period_start(period text) returns date
language sql stable set search_path = '' as $$
  select case period
    when 'week' then date_trunc('week', vn.today)::date
    when 'month' then date_trunc('month', vn.today)::date
    when 'quarter' then date_trunc('quarter', vn.today)::date
  end
  from (select (now() at time zone 'Asia/Ho_Chi_Minh')::date as today) vn;
$$;

-- Mỗi phòng có ít nhất một việc tạo trong kỳ một dòng; department_uuid null = mọi phòng.
create or replace function public.crm_executive_task_stats(period text, department_uuid uuid default null)
returns table (
  department_id uuid, department_name text, dashboard_id uuid,
  todo_count int, in_progress_count int, done_count int, overdue_count int
) language plpgsql stable security definer set search_path = '' as $$
declare period_start date := app_private.crm_period_start(period);
begin
  if period_start is null then raise exception 'INVALID_PERIOD'; end if;
  return query
  select d.id, d.name, dd.id,
    count(*) filter (where t.status = 'todo')::int,
    count(*) filter (where t.status = 'in_progress')::int,
    count(*) filter (where t.status = 'done')::int,
    count(*) filter (where t.status <> 'done'
      and t.due_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date)::int
  from public.tasks t
  join public.departments d on d.id = t.department_id and d.archived_at is null
  left join public.department_dashboards dd on dd.department_id = d.id
  where t.archived_at is null
    and (t.created_at at time zone 'Asia/Ho_Chi_Minh')::date >= period_start
    and (department_uuid is null or t.department_id = department_uuid)
  group by d.id, dd.id
  order by d.name, d.id;
end;
$$;

create or replace view public.upcoming_task_rows with (security_invoker = true) as
select t.id, t.title, t.status, t.priority, t.due_date,
  t.due_date - (now() at time zone 'Asia/Ho_Chi_Minh')::date as days_left,
  t.department_id, d.name as department_name, dd.id as dashboard_id,
  t.assignee_id, e.full_name as assignee_name
from public.tasks t
join public.departments d on d.id = t.department_id and d.archived_at is null
join public.department_dashboards dd on dd.department_id = t.department_id
join public.employees e on e.id = t.assignee_id
where t.archived_at is null and t.status <> 'done' and t.due_date is not null;

-- Lọc việc tạo trong kỳ theo phòng.
create index if not exists tasks_department_created_idx on public.tasks (department_id, created_at)
  where archived_at is null;

-- ---------- Quyền DB ----------

revoke all on public.upcoming_task_rows from public, anon, authenticated;
grant select on public.upcoming_task_rows to service_role;
revoke all on function app_private.crm_period_start(text) from public, anon, authenticated, service_role;
revoke all on function public.crm_executive_task_stats(text, uuid) from public, anon, authenticated;
grant execute on function public.crm_executive_task_stats(text, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261023090000_executive_overview.sql')
on conflict (name) do nothing;

commit;
