begin;

-- Auth Admin may apply app_metadata AFTER auth.users INSERT.
-- Sync on metadata updates as well as insert, without changing role/password/profile.
create function app_private.sync_local_username() returns trigger
language plpgsql security definer set search_path = '' as $$
declare canonical_username text;
begin
  if NEW.raw_app_meta_data ->> 'account_type' <> 'local'
    or NEW.raw_app_meta_data ->> 'account_type' is null then return NEW; end if;
  canonical_username := lower(btrim(NEW.raw_app_meta_data ->> 'username'));
  if canonical_username is null or canonical_username !~ '^[a-z0-9][a-z0-9_.-]{2,31}$' then
    raise exception 'Invalid local username';
  end if;
  update public.app_accounts set username = canonical_username
  where auth_user_id = NEW.id and username is distinct from canonical_username;
  return NEW;
end;
$$;
revoke all on function app_private.sync_local_username() from public, anon, authenticated, service_role;
create trigger auth_user_sync_username after insert or update of raw_app_meta_data on auth.users
for each row execute function app_private.sync_local_username();

-- Refuse ambiguous existing duplicates rather than deleting or choosing an owner.
do $$
begin
  if exists (select 1 from auth.users
    where raw_app_meta_data ->> 'account_type' = 'local'
    group by lower(btrim(raw_app_meta_data ->> 'username')) having count(*) > 1) then
    raise exception 'Duplicate local usernames exist. Review accounts before applying this repair.';
  end if;
end;
$$;
update public.app_accounts a set username = lower(btrim(u.raw_app_meta_data ->> 'username'))
from auth.users u where a.auth_user_id = u.id and a.username is null
  and u.raw_app_meta_data ->> 'account_type' = 'local'
  and lower(btrim(u.raw_app_meta_data ->> 'username')) ~ '^[a-z0-9][a-z0-9_.-]{2,31}$';

-- Check both mapped accounts and historical Auth records not yet mapped.
create function public.crm_username_exists(candidate_username text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_accounts
      where username = lower(btrim(candidate_username)))
    or exists (select 1 from auth.users where raw_app_meta_data ->> 'account_type' = 'local'
      and lower(btrim(raw_app_meta_data ->> 'username')) = lower(btrim(candidate_username)));
$$;
revoke all on function public.crm_username_exists(text) from public, anon, authenticated;
grant execute on function public.crm_username_exists(text) to service_role;
commit;
