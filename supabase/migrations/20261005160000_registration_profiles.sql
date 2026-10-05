begin;

alter table public.employees alter column employee_code drop not null;
alter table public.employees alter column job_title drop not null;
alter table public.employees add column avatar_path text;
alter table public.employees add constraint employees_avatar_path_check
  check (avatar_path is null or length(avatar_path) <= 200);

create function app_private.create_signup_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare account_uuid uuid;
begin
  -- Never trust role/department/employee_code supplied in user_metadata.
  insert into public.app_accounts (auth_user_id, role) values (NEW.id, 'employee')
  returning id into account_uuid;
  insert into public.employees (account_id, full_name)
  values (account_uuid, left(coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'name'), ''), 'Nhân viên mới'), 120));
  return NEW;
end;
$$;
revoke all on function app_private.create_signup_profile() from public, anon, authenticated, service_role;
create trigger auth_user_signup_profile after insert on auth.users
for each row execute function app_private.create_signup_profile();

-- Backfill existing users, preserving roles already granted to CEO/Master.
insert into public.app_accounts (auth_user_id)
select u.id from auth.users u
where not exists (select 1 from public.app_accounts a where a.auth_user_id = u.id);
insert into public.employees (account_id, full_name)
select a.id, left(coalesce(nullif(btrim(u.raw_user_meta_data ->> 'full_name'), ''),
  nullif(btrim(u.raw_user_meta_data ->> 'name'), ''), 'Nhân viên mới'), 120)
from public.app_accounts a join auth.users u on u.id = a.auth_user_id
where not exists (select 1 from public.employees e where e.account_id = a.id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']);

-- Called only inside Storage policies. No table read grants are given to clients.
create function app_private.active_avatar_owner(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null
    and split_part(object_name, '/', 1) = auth.uid()::text
    and object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and exists (select 1 from public.app_accounts a join public.employees e on e.account_id = a.id
      where a.auth_user_id = auth.uid() and a.status = 'active'
        and e.archived_at is null and e.employment_status = 'active');
$$;
grant usage on schema app_private to authenticated;
revoke all on function app_private.active_avatar_owner(text) from public, anon;
grant execute on function app_private.active_avatar_owner(text) to authenticated;
create policy profile_avatars_insert on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and app_private.active_avatar_owner(name));
-- No public read/update/delete policies. API signs short-lived URLs after checking owner.

-- Extend audit attribution for API transactions. Callers cannot set this via the Data API.
create or replace function app_private.audit_directory_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid;
begin
  select a.id into actor_id from public.app_accounts a where a.auth_user_id = auth.uid();
  if actor_id is null then
    actor_id := nullif(current_setting('app.actor_account_id', true), '')::uuid;
  end if;
  if TG_OP = 'UPDATE' then
    NEW.updated_at := clock_timestamp();
    insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, old_values, new_values, created_by)
    values (actor_id, 'update', TG_TABLE_NAME, NEW.id, to_jsonb(OLD), to_jsonb(NEW), actor_id);
  elsif TG_OP = 'INSERT' then
    insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
    values (actor_id, 'insert', TG_TABLE_NAME, NEW.id, to_jsonb(NEW), actor_id);
  else
    raise exception 'Hard delete is forbidden; archive or disable instead';
  end if;
  return NEW;
end;
$$;

-- API-only RPC: Hono verifies JWT and supplies its subject, never a client-supplied ID.
create function public.update_own_profile(
  target_auth_user_id uuid, new_employee_code text, new_avatar_path text,
  replace_avatar boolean default false
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
    avatar_path = case when replace_avatar then new_avatar_path else avatar_path end
  where account_id = account_uuid and archived_at is null and employment_status = 'active';
  if not found then raise exception 'Profile unavailable'; end if;
end;
$$;
revoke all on function public.update_own_profile(uuid, text, text, boolean) from public, anon, authenticated;
grant execute on function public.update_own_profile(uuid, text, text, boolean) to service_role;

commit;
