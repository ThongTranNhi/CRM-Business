-- Ghi lại migration đã chạy, vì migration được áp bằng tay qua SQL Editor.
-- Các file sau kiểm tra file trước đã có trong bảng này rồi mới chạy (docs/changelog/migrations.md).
begin;

do $$
begin
  if to_regprocedure('public.crm_username_exists(text)') is null then
    raise exception 'Chạy 20261005210000_sync_local_usernames.sql trước';
  end if;
end;
$$;

create table if not exists app_private.applied_migrations (
  name text primary key,
  applied_at timestamptz not null default now()
);
alter table app_private.applied_migrations enable row level security;
revoke all on app_private.applied_migrations from public, anon, authenticated, service_role;

-- 4 migration cũ chạy trước khi có bảng này; hàm kiểm tra ở trên chứng minh chúng đã được áp.
insert into app_private.applied_migrations (name) values
  ('20261005120000_employee_directory.sql'),
  ('20261005160000_registration_profiles.sql'),
  ('20261005200000_username_admin_directory.sql'),
  ('20261005210000_sync_local_usernames.sql'),
  ('20261006090000_migration_tracking.sql')
on conflict (name) do nothing;

commit;
