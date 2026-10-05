-- Trưởng phòng là tuỳ chọn (BR-08); tên phòng đã xoá được dùng lại (BR-09).
-- View active_departments là nguồn đọc cho danh sách và ô chọn phòng ban.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090000_migration_tracking.sql') then
    raise exception 'Chạy 20261006090000_migration_tracking.sql trước';
  end if;
end;
$$;

-- Khoá ngoại (manager_employee_id, id) giữ nguyên: khi có trưởng phòng thì người đó phải thuộc phòng.
alter table public.departments alter column manager_employee_id drop not null;

drop index if exists public.departments_name_unique;
create unique index if not exists departments_active_name_unique
  on public.departments (lower(name)) where archived_at is null;
create index if not exists departments_manager_idx on public.departments (manager_employee_id);
create index if not exists departments_archived_idx on public.departments (archived_at);

create or replace view public.active_departments with (security_invoker = true) as
select
  d.id,
  d.name,
  d.manager_employee_id,
  m.full_name as manager_name,
  (select count(*) from public.employees e
    where e.department_id = d.id and e.archived_at is null)::integer as member_count,
  d.created_at
from public.departments d
left join public.employees m on m.id = d.manager_employee_id
where d.archived_at is null;

revoke all on public.active_departments from public, anon, authenticated;
grant select on public.active_departments to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090100_departments_optional_manager.sql')
on conflict (name) do nothing;

commit;
