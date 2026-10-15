-- Hoàn tác xoá công việc (BR-19: xoá = lưu trữ). RPC crm_restore_task bỏ archived_at, đặt task về cuối cột
-- cũ, ghi activity 'restored' + audit 'task.restore'. crm_work_access thấy cả task đã lưu trữ (isArchived)
-- để API kiểm tra quyền hoàn tác; task_cards thêm created_by để board biết ai được xoá thẻ nào.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090800_employee_delete_handover.sql') then
    raise exception 'Chạy 20261006090800_employee_delete_handover.sql trước';
  end if;
end;
$$;

-- BR-20, BR-21: thêm hành động 'restored' (bảng vẫn chỉ INSERT).
alter table public.task_activities drop constraint if exists task_activities_action_check;
alter table public.task_activities add constraint task_activities_action_check
  check (action in ('created', 'assigned', 'assignee_changed', 'collaborators_changed',
    'due_date_changed', 'priority_changed', 'checklist_changed', 'attachment_added',
    'attachment_removed', 'moved', 'completed', 'reopened', 'archived', 'restored',
    'title_changed'));

-- Nối thêm created_by vào cuối view (create or replace view chỉ cho thêm cột ở cuối).
create or replace view public.task_cards with (security_invoker = true) as
select t.id, t.board_id, t.column_id, t.title, t.status, t.position, t.priority, t.due_date,
  t.completed_at,
  t.assignee_id, e.full_name as assignee_name, e.avatar_path as assignee_avatar_path,
  e.archived_at is not null as assignee_archived,
  coalesce((select jsonb_agg(jsonb_build_object('id', ce.id, 'name', ce.full_name,
      'avatarPath', ce.avatar_path) order by ce.full_name, ce.id)
    from public.task_collaborators c join public.employees ce on ce.id = c.employee_id
    where c.task_id = t.id), '[]'::jsonb) as collaborators,
  (select count(*) from public.task_checklist_items i
    where i.task_id = t.id and i.deleted_at is null)::int as checklist_total,
  (select count(*) from public.task_checklist_items i
    where i.task_id = t.id and i.deleted_at is null and i.is_done)::int as checklist_done,
  (select count(*) from public.task_comments m where m.task_id = t.id)::int as comment_count,
  t.created_by
from public.tasks t
join public.employees e on e.id = t.assignee_id
where t.archived_at is null;

-- Như bản 20261006090700, nhưng task đã lưu trữ vẫn trả taskId kèm isArchived = true.
create or replace function public.crm_work_access(user_uuid uuid, board_uuid uuid, task_uuid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with actor as (
    select a.id, a.role, e.id as employee_id, e.department_id
    from public.app_accounts a
    left join public.employees e on e.account_id = a.id and e.archived_at is null
    where a.auth_user_id = user_uuid and a.status = 'active'
  ), target as (
    select b.id as board_id, dd.department_id, d.manager_employee_id, d.archived_at,
      t.id as task_id, t.assignee_id, t.created_by, t.archived_at as task_archived_at
    from public.boards b
    join public.department_dashboards dd on dd.id = b.dashboard_id
    join public.departments d on d.id = dd.department_id
    left join public.tasks t on t.id = task_uuid and t.board_id = b.id
    where b.id = coalesce(board_uuid, (select board_id from public.tasks where id = task_uuid))
  )
  select jsonb_build_object('accountId', actor.id, 'role', actor.role,
    'employeeId', actor.employee_id, 'boardId', target.board_id,
    'departmentId', target.department_id, 'isReadOnly', target.archived_at is not null,
    'isDepartmentMember', coalesce(actor.department_id = target.department_id, false),
    'isDepartmentManager', coalesce(actor.employee_id = target.manager_employee_id, false),
    'isBoardMember', exists (select 1 from public.board_members m
      where m.board_id = target.board_id and m.employee_id = actor.employee_id),
    'taskId', target.task_id,
    'isArchived', target.task_archived_at is not null,
    'isAssignee', coalesce(actor.employee_id = target.assignee_id, false),
    'isCollaborator', exists (select 1 from public.task_collaborators c
      where c.task_id = target.task_id and c.employee_id = actor.employee_id),
    'isCreator', coalesce(actor.id = target.created_by, false))
  from actor cross join target;
$$;

-- Hoàn tác lưu trữ: task về cuối cột cũ (cột không bị xoá ở Đợt 2). Quyền (như xoá) kiểm tra ở API.
create or replace function public.crm_restore_task(actor_uuid uuid, task_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; task_row public.tasks;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  select * into task_row from public.tasks
  where id = task_uuid and archived_at is not null for update;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  perform app_private.crm_assert_board_writable(task_row.board_id);
  update public.tasks set archived_at = null,
    position = coalesce((select max(position) from public.tasks
      where column_id = task_row.column_id and archived_at is null), -1024) + 1024
  where id = task_uuid;
  perform app_private.crm_log_task(task_uuid, actor_id, 'restored', null, null);
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
  values (actor_id, 'task.restore', 'tasks', task_uuid,
    jsonb_build_object('title', task_row.title, 'boardId', task_row.board_id), actor_id);
end;
$$;

revoke all on public.task_cards from public, anon, authenticated;
grant select on public.task_cards to service_role;
revoke all on function public.crm_work_access(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_work_access(uuid, uuid, uuid) to service_role;
revoke all on function public.crm_restore_task(uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_restore_task(uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261007090000_task_restore.sql')
on conflict (name) do nothing;

commit;
