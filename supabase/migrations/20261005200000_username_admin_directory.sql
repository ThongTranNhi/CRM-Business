begin;
alter table public.app_accounts add column username text;
alter table public.app_accounts add column must_change_password boolean not null default false;
alter table public.app_accounts add column password_reset_version integer not null default 0;
alter table public.app_accounts add constraint app_accounts_username_check
  check (username is null or username ~ '^[a-z0-9][a-z0-9_.-]{2,31}$');
create unique index app_accounts_username_unique on public.app_accounts (username) where username is not null;

create or replace function app_private.create_signup_profile() returns trigger
language plpgsql security definer set search_path = '' as $$
declare account_uuid uuid; local_username text;
begin
  -- app_metadata is set only by the server; user_metadata never controls privileges.
  if NEW.raw_app_meta_data ->> 'account_type' = 'local' then
    local_username := NEW.raw_app_meta_data ->> 'username';
    if local_username is null then raise exception 'Username required'; end if;
  end if;
  insert into public.app_accounts (auth_user_id, role, username)
  values (NEW.id, 'employee', local_username) returning id into account_uuid;
  insert into public.employees (account_id, full_name)
  values (account_uuid, left(coalesce(nullif(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(NEW.raw_user_meta_data ->> 'name'), ''), local_username, 'Nhân viên mới'), 120));
  return NEW;
end;
$$;

-- A revoked auth.sessions row makes even an unexpired access token unusable at API.
create function public.crm_session_context(user_uuid uuid, session_uuid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', a.id, 'role', a.role, 'status', a.status,
    'username', a.username, 'mustChangePassword', a.must_change_password,
    'resetVersion', a.password_reset_version)
  from public.app_accounts a
  where a.auth_user_id = user_uuid and exists (
    select 1 from auth.sessions s where s.id = session_uuid and s.user_id = user_uuid
  );
$$;
revoke all on function public.crm_session_context(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_session_context(uuid, uuid) to service_role;

create function public.crm_begin_password_reset(actor_uuid uuid, employee_uuid uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; target_user uuid; target_id uuid;
begin
  select id into actor_id from public.app_accounts
  where auth_user_id = actor_uuid and role = 'super_admin' and status = 'active'
    and not must_change_password;
  if actor_id is null then raise exception 'Forbidden'; end if;
  select a.auth_user_id, a.id into target_user, target_id
  from public.employees e join public.app_accounts a on a.id = e.account_id
  where e.id = employee_uuid and e.archived_at is null and a.username is not null
    and a.role <> 'super_admin' and a.status = 'active' for update of a;
  if target_user is null then raise exception 'Local employee account required'; end if;
  perform set_config('app.actor_account_id', actor_id::text, true);
  update public.app_accounts set must_change_password = true,
    password_reset_version = password_reset_version + 1 where id = target_id;
  delete from auth.sessions where user_id = target_user;
  return target_user;
end;
$$;
revoke all on function public.crm_begin_password_reset(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_begin_password_reset(uuid, uuid) to service_role;

create function public.crm_finish_password_change(user_uuid uuid, session_uuid uuid, expected_version integer)
returns void language plpgsql security definer set search_path = '' as $$
declare account_uuid uuid;
begin
  select id into account_uuid from public.app_accounts
  where auth_user_id = user_uuid and status = 'active' and username is not null
    and password_reset_version = expected_version for update;
  if account_uuid is null or not exists (select 1 from auth.sessions s
    where s.id = session_uuid and s.user_id = user_uuid) then raise exception 'Session unavailable'; end if;
  perform set_config('app.actor_account_id', account_uuid::text, true);
  update public.app_accounts set must_change_password = false where id = account_uuid;
  delete from auth.sessions where user_id = user_uuid and id <> session_uuid;
end;
$$;
revoke all on function public.crm_finish_password_change(uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.crm_finish_password_change(uuid, uuid, integer) to service_role;

create function public.crm_admin_update_employee(actor_uuid uuid, employee_uuid uuid,
  employee_name text, employee_job_title text, employee_department_id uuid, account_status text)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; target_account uuid; target_role text;
begin
  select id into actor_id from public.app_accounts where auth_user_id = actor_uuid
    and role = 'super_admin' and status = 'active' and not must_change_password;
  if actor_id is null then raise exception 'Forbidden'; end if;
  select e.account_id, a.role into target_account, target_role from public.employees e
  left join public.app_accounts a on a.id = e.account_id where e.id = employee_uuid
    and e.archived_at is null for update of e;
  if not found then raise exception 'Employee unavailable'; end if;
  if target_role = 'super_admin' then raise exception 'Cannot modify administrator via employee form'; end if;
  if account_status not in ('active', 'disabled') then raise exception 'Invalid status'; end if;
  if nullif(btrim(employee_name), '') is null or length(employee_name) > 120 then
    raise exception 'Invalid name'; end if;
  perform set_config('app.actor_account_id', actor_id::text, true);
  update public.employees set full_name = btrim(employee_name), job_title = nullif(btrim(employee_job_title), ''),
    department_id = employee_department_id where id = employee_uuid;
  if target_account is not null then
    update public.app_accounts set status = account_status where id = target_account;
    if account_status = 'disabled' then
      delete from auth.sessions where user_id = (select auth_user_id from public.app_accounts where id = target_account);
    end if;
  end if;
end;
$$;
revoke all on function public.crm_admin_update_employee(uuid, uuid, text, text, uuid, text) from public, anon, authenticated;
grant execute on function public.crm_admin_update_employee(uuid, uuid, text, text, uuid, text) to service_role;

-- Durable rate limits on public authentication endpoints; keys are SHA256, not raw IPs.
create table app_private.auth_rate_limits (
  key text primary key, window_start timestamptz not null, attempts integer not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table app_private.auth_rate_limits enable row level security;
revoke all on app_private.auth_rate_limits from public, anon, authenticated;
create function public.crm_auth_rate_limit(key_hash text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare hits integer;
begin
  if key_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid rate key'; end if;
  insert into app_private.auth_rate_limits (key, window_start, attempts)
  values (key_hash, now(), 1) on conflict (key) do update set
    attempts = case when auth_rate_limits.window_start < now() - interval '1 minute'
      then 1 else auth_rate_limits.attempts + 1 end,
    window_start = case when auth_rate_limits.window_start < now() - interval '1 minute'
      then now() else auth_rate_limits.window_start end, updated_at = now()
  returning attempts into hits;
  return hits <= 10;
end;
$$;
revoke all on function public.crm_auth_rate_limit(text) from public, anon, authenticated;
grant execute on function public.crm_auth_rate_limit(text) to service_role;

-- Include must-change-password in existing private avatar upload gate.
create or replace function app_private.active_avatar_owner(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and split_part(object_name, '/', 1) = auth.uid()::text
    and object_name ~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and exists (select 1 from auth.sessions s where s.user_id = auth.uid()
      and s.id::text = auth.jwt() ->> 'session_id')
    and exists (select 1 from public.app_accounts a join public.employees e on e.account_id = a.id
      where a.auth_user_id = auth.uid() and a.status = 'active' and not a.must_change_password
        and e.archived_at is null and e.employment_status = 'active');
$$;
commit;
