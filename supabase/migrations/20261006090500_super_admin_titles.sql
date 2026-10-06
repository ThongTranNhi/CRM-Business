-- Phân biệt hai tài khoản Super Admin: nhãn hiển thị (CEO / Master) lưu cạnh email trong allowlist.
-- crm_session_context trả thêm adminTitle (chỉ khi role = super_admin) để /api/auth/me hiện đúng nhãn.
-- Nhãn chỉ để hiển thị, không ảnh hưởng quyền: quyền vẫn theo app_accounts.role.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090400_employee_restore_previous_status.sql') then
    raise exception 'Chạy 20261006090400_employee_restore_previous_status.sql trước';
  end if;
end;
$$;

alter table app_private.super_admin_allowlist add column if not exists title text;
alter table app_private.super_admin_allowlist drop constraint if exists super_admin_allowlist_title_check;
alter table app_private.super_admin_allowlist add constraint super_admin_allowlist_title_check
  check (title is null or (title = btrim(title) and char_length(title) between 1 and 40));

update app_private.super_admin_allowlist set title = 'CEO', updated_at = now()
where email = 'jathong0107@gmail.com';
update app_private.super_admin_allowlist set title = 'Master', updated_at = now()
where email = 'thongtran2446@gmail.com';

create or replace function public.crm_session_context(user_uuid uuid, session_uuid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', a.id, 'role', a.role, 'status', a.status,
    'username', a.username, 'mustChangePassword', a.must_change_password,
    'resetVersion', a.password_reset_version,
    'adminTitle', (
      select l.title from auth.users u
      join app_private.super_admin_allowlist l on l.email = lower(u.email)
      where u.id = a.auth_user_id and a.role = 'super_admin'
    ))
  from public.app_accounts a
  where a.auth_user_id = user_uuid and exists (
    select 1 from auth.sessions s where s.id = session_uuid and s.user_id = user_uuid
  );
$$;
revoke all on function public.crm_session_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_session_context(uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090500_super_admin_titles.sql')
on conflict (name) do nothing;

commit;
