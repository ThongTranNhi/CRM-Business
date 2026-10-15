-- Thùng rác công việc (mỗi board một thùng rác): xem và khôi phục task đã xoá (lưu trữ). Không có xoá vĩnh
-- viễn (BR-19, BR-55). View task_trash: task đã lưu trữ + tên cột cũ, người phụ trách, người xoá (activity
-- 'archived' mới nhất) — một truy vấn, không N+1. Quyền lọc ở API (lib/work-access.ts: trashScope).
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261007090000_task_restore.sql') then
    raise exception 'Chạy 20261007090000_task_restore.sql trước';
  end if;
end;
$$;

-- Thùng rác của một board, mới xoá trước.
create index if not exists tasks_board_archived_idx
  on public.tasks (board_id, archived_at desc) where archived_at is not null;

create or replace view public.task_trash with (security_invoker = true) as
select t.id, t.board_id, t.title, t.archived_at, t.created_by,
  c.name as column_name,
  t.assignee_id, e.full_name as assignee_name,
  archived.actor_id as archived_by_id, p.display_name as archived_by_name
from public.tasks t
join public.board_columns c on c.id = t.column_id
join public.employees e on e.id = t.assignee_id
left join lateral (
  select v.actor_id from public.task_activities v
  where v.task_id = t.id and v.action = 'archived'
  order by v.created_at desc
  limit 1
) archived on true
left join public.account_profiles p on p.account_id = archived.actor_id
where t.archived_at is not null;

revoke all on public.task_trash from public, anon, authenticated;
grant select on public.task_trash to service_role;

insert into app_private.applied_migrations (name)
values ('20261007100000_task_trash.sql')
on conflict (name) do nothing;

commit;
