-- Run once through the migration workflow or Supabase SQL Editor.
-- No business data is deleted. All directory access goes through the API.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table app_private.super_admin_allowlist (
  email text primary key check (email = lower(btrim(email))),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
insert into app_private.super_admin_allowlist (email) values
  ('jathong0107@gmail.com'),
  ('thongtran2446@gmail.com');
alter table app_private.super_admin_allowlist enable row level security;
revoke all on app_private.super_admin_allowlist from public, anon, authenticated;

create table public.app_accounts (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  role text not null default 'employee' check (role in (
    'super_admin', 'hr_admin', 'department_manager', 'team_leader', 'employee'
  )),
  status text not null default 'active' check (status in ('active', 'blocked', 'disabled')),
  blocked_at timestamptz,
  blocked_by uuid references public.app_accounts(id) on delete restrict,
  blocked_reason text,
  created_by uuid references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'blocked' or (blocked_at is not null and nullif(btrim(blocked_reason), '') is not null))
);

create table public.departments (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and name <> ''),
  manager_employee_id uuid not null,
  archived_at timestamptz,
  created_by uuid references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index departments_name_unique on public.departments (lower(name));

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  account_id uuid unique references public.app_accounts(id) on delete restrict,
  employee_code text not null check (employee_code = btrim(employee_code) and employee_code <> ''),
  full_name text not null check (full_name = btrim(full_name) and full_name <> ''),
  job_title text not null check (job_title = btrim(job_title) and job_title <> ''),
  department_id uuid references public.departments(id) on delete restrict,
  employment_status text not null default 'active' check (employment_status in ('active', 'inactive')),
  archived_at timestamptz,
  created_by uuid references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, department_id)
);
create unique index employees_code_unique on public.employees (lower(employee_code));
create index employees_department_idx on public.employees (department_id);
create index employees_name_idx on public.employees (lower(full_name));

-- Deferred FK allows inserting a department and its first manager in one transaction.
-- The manager must belong to that department. Changing departments needs a replacement manager.
alter table public.departments add constraint departments_manager_same_department_fk
  foreign key (manager_employee_id, id)
  references public.employees(id, department_id)
  on delete restrict deferrable initially deferred;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_account_id uuid references public.app_accounts(id) on delete restrict,
  action text not null,
  resource_type text not null,
  resource_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  created_by uuid references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_resource_idx on public.audit_logs (resource_type, resource_id, created_at);

create function app_private.audit_directory_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid;
begin
  -- For API writes: set request context through a future transaction RPC.
  -- Never fabricate the actor from the changed record's created_by.
  select a.id into actor_id from public.app_accounts a where a.auth_user_id = auth.uid();
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
revoke all on function app_private.audit_directory_change() from public, anon, authenticated;

create function app_private.reject_log_mutation() returns trigger
language plpgsql set search_path = '' as $$
begin
  raise exception 'Audit logs are append-only';
end;
$$;
revoke all on function app_private.reject_log_mutation() from public, anon, authenticated;

create trigger app_accounts_audit before insert or update or delete on public.app_accounts
  for each row execute function app_private.audit_directory_change();
create trigger departments_audit before insert or update or delete on public.departments
  for each row execute function app_private.audit_directory_change();
create trigger employees_audit before insert or update or delete on public.employees
  for each row execute function app_private.audit_directory_change();
create trigger audit_logs_immutable before update or delete or truncate on public.audit_logs
  for each statement execute function app_private.reject_log_mutation();

alter table public.app_accounts enable row level security;
alter table public.departments enable row level security;
alter table public.employees enable row level security;
alter table public.audit_logs enable row level security;
revoke all on public.app_accounts, public.departments, public.employees, public.audit_logs
  from public, anon, authenticated;
grant select, insert, update on public.app_accounts, public.departments, public.employees to service_role;
revoke delete, truncate on public.app_accounts, public.departments, public.employees from service_role;
grant select on public.audit_logs to service_role;
revoke insert, update, delete, truncate on public.audit_logs from service_role;

-- Only SQL administrators may bootstrap an allowlisted, confirmed Google identity.
-- Run after each admin has signed in with Google at least once.
create function app_private.provision_super_admin(admin_email text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  user_id uuid;
  account_id uuid;
begin
  if not exists (select 1 from app_private.super_admin_allowlist a
    where a.email = lower(btrim(admin_email))) then
    raise exception 'Email is not allowlisted';
  end if;
  select u.id into user_id from auth.users u
  where lower(u.email) = lower(btrim(admin_email)) and u.email_confirmed_at is not null
    and exists (select 1 from auth.identities i where i.user_id = u.id
      and i.provider = 'google'
      and lower(i.identity_data ->> 'email') = lower(btrim(admin_email))
      and i.identity_data ->> 'email_verified' = 'true');
  if user_id is null then
    raise exception 'A verified Google login is required first';
  end if;
  insert into public.app_accounts (auth_user_id, role) values (user_id, 'super_admin')
    on conflict (auth_user_id) do update set role = 'super_admin'
    returning id into account_id;
  update auth.users set raw_app_meta_data =
    coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'super_admin')
    where id = user_id;
  return account_id;
end;
$$;
revoke all on function app_private.provision_super_admin(text) from public, anon, authenticated, service_role;

commit;
