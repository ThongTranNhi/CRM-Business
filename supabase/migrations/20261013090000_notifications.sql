-- Đợt 3 S3 — Thông báo (frontend-spec 3.2, 4.21). Người nhận là tài khoản (app_accounts) còn hoạt động.
-- - Được giao việc / thêm làm người phối hợp: trigger trên task_activities ('assigned', 'assignee_changed',
--   'collaborators_changed') — cùng giao dịch với RPC đã ghi activity, không sửa từng RPC. Bàn giao khi xoá
--   nhân viên cũng ghi 'assignee_changed' nên người nhận bàn giao có thông báo.
-- - @mention: crm_add_comment nhận thêm mention_uuids (DROP chữ ký cũ để PostgREST không gọi nhầm).
-- - Sắp đến hạn (còn 1 ngày) / quá hạn: crm_generate_due_notifications, Worker gọi mỗi sáng (Cron Trigger).
--   Chạy lại trong ngày không tạo trùng (unique dedupe_key).
-- Không thông báo cho chính người thao tác. Chưa áp.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261012090000_project_owner_handover.sql') then
    raise exception 'Chạy 20261012090000_project_owner_handover.sql trước';
  end if;
end;
$$;

-- ---------- Bảng ----------

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_account_id uuid not null references public.app_accounts(id) on delete restrict,
  -- null: hệ thống (sắp đến hạn / quá hạn).
  actor_account_id uuid references public.app_accounts(id) on delete restrict,
  type text not null constraint notifications_type_check check (type in (
    'task_assigned', 'task_collaborator_added', 'comment_mention', 'task_due_soon', 'task_overdue')),
  task_id uuid not null references public.tasks(id) on delete restrict,
  comment_id uuid references public.task_comments(id) on delete restrict,
  -- Khoá chống trùng của thông báo hệ thống: hạn của task lúc gửi (đổi hạn → được nhắc lại).
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_account_id, created_at desc);
create index if not exists notifications_unread_idx
  on public.notifications (recipient_account_id) where read_at is null;
create unique index if not exists notifications_dedupe_unique
  on public.notifications (recipient_account_id, type, task_id, dedupe_key) where dedupe_key is not null;

drop trigger if exists notifications_updated_at on public.notifications;
create trigger notifications_updated_at before update on public.notifications
  for each row execute function app_private.set_updated_at();

-- Một dòng thông báo kèm tên task, Dashboard để mở (?task=), người thao tác, đoạn đầu bình luận.
create or replace view public.notification_feed with (security_invoker = true) as
select n.id, n.type, n.created_at, n.read_at, n.task_id, n.comment_id,
  a.auth_user_id as recipient_user_id,
  t.title as task_title, t.due_date as task_due_date, t.archived_at is not null as task_archived,
  dd.id as dashboard_id,
  n.actor_account_id, p.display_name as actor_name,
  left(c.body, 160) as comment_excerpt
from public.notifications n
join public.app_accounts a on a.id = n.recipient_account_id
join public.tasks t on t.id = n.task_id
join public.boards b on b.id = t.board_id
join public.department_dashboards dd on dd.id = b.dashboard_id
left join public.account_profiles p on p.account_id = n.actor_account_id
left join public.task_comments c on c.id = n.comment_id;

-- ---------- Hàm nội bộ ----------

-- Tài khoản còn hoạt động của một nhân viên chưa nghỉ; null nếu không có.
create or replace function app_private.crm_active_account_of(employee_uuid uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select a.id from public.employees e
  join public.app_accounts a on a.id = e.account_id
  where e.id = employee_uuid and e.archived_at is null and a.status = 'active';
$$;

-- Ghi một thông báo cho nhân viên; bỏ qua nếu không có tài khoản hoạt động hoặc là chính người thao tác.
create or replace function app_private.crm_notify(
  employee_uuid uuid, actor_id uuid, notification_type text, task_uuid uuid, comment_uuid uuid
) returns void language plpgsql security definer set search_path = '' as $$
declare recipient uuid := app_private.crm_active_account_of(employee_uuid);
begin
  if recipient is null or recipient is not distinct from actor_id then return; end if;
  insert into public.notifications (recipient_account_id, actor_account_id, type, task_id, comment_id)
  values (recipient, actor_id, notification_type, task_uuid, comment_uuid);
end;
$$;

-- Trigger: activity giao việc / người phối hợp → thông báo cho người được giao / được thêm.
create or replace function app_private.crm_notify_from_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
declare employee_uuid uuid;
begin
  if new.action in ('assigned', 'assignee_changed') then
    perform app_private.crm_notify((new.to_value ->> 'assigneeId')::uuid, new.actor_id,
      'task_assigned', new.task_id, null);
  elsif new.action = 'collaborators_changed' then
    for employee_uuid in
      select value::uuid from jsonb_array_elements_text(coalesce(new.to_value -> 'employeeIds', '[]'))
      except
      select value::uuid from jsonb_array_elements_text(coalesce(new.from_value -> 'employeeIds', '[]'))
    loop
      perform app_private.crm_notify(employee_uuid, new.actor_id, 'task_collaborator_added',
        new.task_id, null);
    end loop;
  end if;
  return null;
end;
$$;

drop trigger if exists task_activities_notify on public.task_activities;
create trigger task_activities_notify after insert on public.task_activities
  for each row execute function app_private.crm_notify_from_activity();

-- ---------- RPC ----------

-- Như bản 20261006090700 + mention_uuids: người được nhắc phải xem được task (thuộc board); người khác bị bỏ
-- qua, không báo lỗi (gợi ý tên ở giao diện chỉ có thành viên board).
drop function if exists public.crm_add_comment(uuid, uuid, text, uuid);

create or replace function public.crm_add_comment(
  actor_uuid uuid, task_uuid uuid, comment_body text, parent_uuid uuid, mention_uuids uuid[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; parent_of_parent uuid; comment_uuid uuid; task_row public.tasks;
  employee_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  task_row := app_private.crm_lock_writable_task(task_uuid);
  if parent_uuid is not null then
    select parent_id into parent_of_parent from public.task_comments
    where id = parent_uuid and task_id = task_uuid;
    if not found then raise exception 'COMMENT_NOT_FOUND'; end if;
    if parent_of_parent is not null then raise exception 'COMMENT_REPLY_TOO_DEEP'; end if;
  end if;
  insert into public.task_comments (task_id, parent_id, author_id, body)
  values (task_uuid, parent_uuid, actor_id, btrim(comment_body))
  returning id into comment_uuid;
  foreach employee_uuid in array app_private.crm_distinct_ids(mention_uuids) loop
    if app_private.crm_is_board_member(task_row.board_id, employee_uuid) then
      perform app_private.crm_notify(employee_uuid, actor_id, 'comment_mention', task_uuid, comment_uuid);
    end if;
  end loop;
  return comment_uuid;
end;
$$;

-- Worker gọi mỗi sáng. Việc chưa xong, chưa lưu trữ, phòng chưa xoá; gửi người phụ trách và người phối hợp còn
-- thuộc board. Sắp đến hạn: hạn = ngày mai. Quá hạn: hạn trong 3 ngày qua (lỡ một lần chạy vẫn gửi; việc quá
-- hạn lâu trước khi có tính năng này không bị gửi dồn). Trả số thông báo mới.
create or replace function public.crm_generate_due_notifications() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare today date := (now() at time zone 'Asia/Ho_Chi_Minh')::date; due_soon integer; overdue integer;
begin
  with targets as (
    select t.id as task_id, t.due_date,
      case when t.due_date = today + 1 then 'task_due_soon' else 'task_overdue' end as type,
      people.employee_id, t.board_id
    from public.tasks t
    join public.boards b on b.id = t.board_id
    join public.department_dashboards dd on dd.id = b.dashboard_id
    join public.departments d on d.id = dd.department_id
    cross join lateral (
      select t.assignee_id as employee_id
      union
      select c.employee_id from public.task_collaborators c where c.task_id = t.id
    ) people
    where t.archived_at is null and t.status <> 'done' and d.archived_at is null
      and (t.due_date = today + 1 or t.due_date between today - 3 and today - 1)
  ), inserted as (
    insert into public.notifications (recipient_account_id, type, task_id, dedupe_key)
    select app_private.crm_active_account_of(x.employee_id), x.type, x.task_id, x.due_date::text
    from targets x
    where app_private.crm_active_account_of(x.employee_id) is not null
      and app_private.crm_is_board_member(x.board_id, x.employee_id)
    on conflict (recipient_account_id, type, task_id, dedupe_key) where dedupe_key is not null
    do nothing
    returning type
  )
  select count(*) filter (where type = 'task_due_soon'), count(*) filter (where type = 'task_overdue')
  into due_soon, overdue from inserted;
  return jsonb_build_object('dueSoon', due_soon, 'overdue', overdue);
end;
$$;

-- Đánh dấu đã đọc: notification_uuids null → tất cả thông báo chưa đọc của người gọi. Chỉ đụng thông báo của
-- chính người gọi. Trả số dòng đã đổi.
create or replace function public.crm_mark_notifications_read(user_uuid uuid, notification_uuids uuid[])
returns integer language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; changed integer;
begin
  actor_id := app_private.crm_work_actor(user_uuid);
  update public.notifications set read_at = now()
  where recipient_account_id = actor_id and read_at is null
    and (notification_uuids is null or id = any (notification_uuids));
  get diagnostics changed = row_count;
  return changed;
end;
$$;

-- ---------- Quyền DB ----------

alter table public.notifications enable row level security;
revoke all on public.notifications from public, anon, authenticated, service_role;
grant select on public.notifications to service_role;
revoke all on public.notification_feed from public, anon, authenticated;
grant select on public.notification_feed to service_role;

do $$
declare signature text;
begin
  foreach signature in array array[
    'app_private.crm_active_account_of(uuid)',
    'app_private.crm_notify(uuid, uuid, text, uuid, uuid)',
    'app_private.crm_notify_from_activity()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
  end loop;
  foreach signature in array array[
    'public.crm_add_comment(uuid, uuid, text, uuid, uuid[])',
    'public.crm_generate_due_notifications()',
    'public.crm_mark_notifications_read(uuid, uuid[])'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261013090000_notifications.sql')
on conflict (name) do nothing;

commit;
