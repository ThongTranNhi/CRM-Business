-- Hồ sơ của tôi: nhân viên tự đổi họ tên của mình (chủ dự án yêu cầu 05/11/2026).
-- update_own_profile thêm tham số new_full_name (mặc định null = giữ tên cũ) — API gọi theo tên tham số nên bản API
-- cũ vẫn chạy sau khi áp. Tên: không rỗng, tối đa 120 ký tự (như form Super Admin, crm_admin_update_employee).
-- Thay đổi ghi audit_logs qua trigger employees_audit sẵn có (actor = chính người đổi).
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261023090000_executive_overview.sql') then
    raise exception 'Chạy 20261023090000_executive_overview.sql trước';
  end if;
end;
$$;

drop function if exists public.update_own_profile(uuid, text, text, boolean);

-- create or replace: lỡ chạy lại file này cũng không lỗi (bản 5 tham số đã có thì thay bằng chính nó).
create or replace function public.update_own_profile(
  target_auth_user_id uuid, new_employee_code text, new_avatar_path text,
  replace_avatar boolean default false, new_full_name text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare account_uuid uuid;
begin
  select id into account_uuid from public.app_accounts
  where auth_user_id = target_auth_user_id and status = 'active' for update;
  if account_uuid is null then raise exception 'Account unavailable'; end if;
  if new_employee_code is not null and
    (length(btrim(new_employee_code)) not between 1 and 50) then
    raise exception 'Invalid employee code';
  end if;
  if new_full_name is not null and length(btrim(new_full_name)) not between 1 and 120 then
    raise exception 'INVALID_FULL_NAME';
  end if;
  if replace_avatar and new_avatar_path is not null then
    if split_part(new_avatar_path, '/', 1) <> target_auth_user_id::text
      or not exists (select 1 from storage.objects
        where bucket_id = 'profile-avatars' and name = new_avatar_path) then
      raise exception 'Invalid avatar';
    end if;
  end if;
  perform set_config('app.actor_account_id', account_uuid::text, true);
  update public.employees set
    employee_code = nullif(btrim(new_employee_code), ''),
    avatar_path = case when replace_avatar then new_avatar_path else avatar_path end,
    full_name = coalesce(btrim(new_full_name), full_name)
  where account_id = account_uuid and archived_at is null and employment_status = 'active';
  if not found then raise exception 'Profile unavailable'; end if;
end;
$$;

revoke all on function public.update_own_profile(uuid, text, text, boolean, text)
  from public, anon, authenticated;
grant execute on function public.update_own_profile(uuid, text, text, boolean, text) to service_role;

insert into app_private.applied_migrations (name)
values ('20261105090000_employees_own_name_change.sql')
on conflict (name) do nothing;

commit;
