-- Đợt 3 S1 — Dự án (BR-30, BR-31): Phòng ban → Dự án → Task.
-- - projects, project_members (Q6: chỉ người thuộc phòng hoặc được mời vào board của phòng).
-- - Khoá ngoại ghép tasks(project_id, department_id) → projects(id, department_id): task chỉ gắn dự án
--   cùng phòng (project_id null thì không kiểm tra — MATCH SIMPLE).
-- - View project_summaries: tiến độ tính từ task thật (đã xong / chưa lưu trữ), quá hạn theo giờ Việt
--   Nam — một truy vấn. project_activity_feed: lịch sử dự án từ audit_logs.
-- - RPC tạo / sửa / lưu trữ / khôi phục / đặt thành viên (ghi audit). crm_create_task thêm project_uuid
--   (DROP chữ ký cũ để PostgREST không gọi nhầm); crm_update_task nhận khoá projectId trong changes và ghi
--   activity 'project_changed'. Quyền theo vai trò kiểm tra ở API (modules/projects).
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261008090000_handover_writable_boards.sql') then
    raise exception 'Chạy 20261008090000_handover_writable_boards.sql trước';
  end if;
end;
$$;

-- ---------- Bảng ----------

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null references public.departments(id) on delete restrict,
  name text not null constraint projects_name_check
    check (name = btrim(name) and char_length(name) between 1 and 120),
  description text constraint projects_description_check check (char_length(description) <= 2000),
  owner_employee_id uuid references public.employees(id) on delete restrict,
  status text not null default 'planning' constraint projects_status_check
    check (status in ('planning', 'active', 'on_hold', 'done')),
  start_date date,
  due_date date,
  archived_at timestamptz,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint projects_date_range_check
    check (start_date is null or due_date is null or start_date <= due_date),
  -- Đích của khoá ngoại ghép từ tasks (task chỉ gắn dự án cùng phòng).
  constraint projects_id_department_key unique (id, department_id)
);
-- Tên dự án không trùng trong một phòng (không phân biệt hoa thường), chỉ xét dự án chưa lưu trữ.
create unique index if not exists projects_department_name_key
  on public.projects (department_id, lower(name)) where archived_at is null;
create index if not exists projects_department_idx on public.projects (department_id, archived_at);
create index if not exists projects_status_idx on public.projects (status) where archived_at is null;
create index if not exists projects_owner_idx on public.projects (owner_employee_id);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (project_id, employee_id)
);
create index if not exists project_members_employee_idx on public.project_members (employee_id);

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at before update on public.projects
  for each row execute function app_private.set_updated_at();
drop trigger if exists project_members_updated_at on public.project_members;
create trigger project_members_updated_at before update on public.project_members
  for each row execute function app_private.set_updated_at();

-- BR-30: task chỉ gắn dự án cùng phòng ban.
alter table public.tasks drop constraint if exists tasks_project_department_fk;
alter table public.tasks add constraint tasks_project_department_fk
  foreign key (project_id, department_id) references public.projects (id, department_id)
  on delete restrict;

-- BR-20: đổi dự án của task được ghi lại (bảng vẫn chỉ INSERT).
alter table public.task_activities drop constraint if exists task_activities_action_check;
alter table public.task_activities add constraint task_activities_action_check
  check (action in ('created', 'assigned', 'assignee_changed', 'collaborators_changed',
    'due_date_changed', 'priority_changed', 'checklist_changed', 'attachment_added',
    'attachment_removed', 'moved', 'completed', 'reopened', 'archived', 'restored',
    'title_changed', 'project_changed'));

-- ---------- View đọc (security_invoker, chỉ service_role) ----------

-- BR-31: tiến độ = task xong / task chưa lưu trữ; quá hạn theo ngày Việt Nam (BR-16).
create or replace view public.project_summaries with (security_invoker = true) as
select pr.id, pr.department_id, d.name as department_name, d.archived_at as department_archived_at,
  dd.id as dashboard_id, b.id as board_id,
  pr.name, pr.description, pr.status, pr.start_date, pr.due_date, pr.archived_at, pr.created_at,
  pr.owner_employee_id, o.full_name as owner_name,
  count(t.id)::int as task_total,
  count(t.id) filter (where t.status = 'done')::int as task_done,
  count(t.id) filter (where t.status <> 'done'
    and t.due_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date)::int as task_overdue,
  (select count(*) from public.project_members m where m.project_id = pr.id)::int as member_count
from public.projects pr
join public.departments d on d.id = pr.department_id
left join public.employees o on o.id = pr.owner_employee_id
left join public.department_dashboards dd on dd.department_id = pr.department_id
left join public.boards b on b.dashboard_id = dd.id
left join public.tasks t on t.project_id = pr.id and t.archived_at is null
group by pr.id, d.id, o.id, dd.id, b.id;

-- Lịch sử dự án: audit_logs của dự án (tạo, sửa, thành viên, lưu trữ, thêm / bỏ task).
create or replace view public.project_activity_feed with (security_invoker = true) as
select l.id, l.resource_id as project_id, l.action, l.old_values, l.new_values, l.created_at,
  l.actor_account_id as actor_id, p.display_name as actor_name
from public.audit_logs l
left join public.account_profiles p on p.account_id = l.actor_account_id
where l.resource_type = 'projects';

-- Nối thêm project_id, project_name vào cuối task_cards (create or replace chỉ cho thêm cột ở cuối).
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
  t.created_by,
  t.project_id, pr.name as project_name
from public.tasks t
join public.employees e on e.id = t.assignee_id
left join public.projects pr on pr.id = t.project_id
where t.archived_at is null;

-- ---------- Hàm nội bộ ----------

-- Q6: nhân viên đang làm, thuộc phòng hoặc được mời vào board của Dashboard phòng đó.
create or replace function app_private.crm_assert_project_participant(
  department_uuid uuid, employee_uuid uuid
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.employees e
    where e.id = employee_uuid and e.archived_at is null and (e.department_id = department_uuid
      or exists (select 1 from public.board_members m
        join public.boards b on b.id = m.board_id
        join public.department_dashboards dd on dd.id = b.dashboard_id
        where dd.department_id = department_uuid and m.employee_id = e.id))
  ) then
    raise exception 'PROJECT_MEMBER_NOT_ELIGIBLE';
  end if;
end;
$$;

-- Khoá dự án (chưa / đã lưu trữ tuỳ want_archived) và phòng của nó (phòng đã xoá → DEPARTMENT_NOT_FOUND).
create or replace function app_private.crm_lock_project(project_uuid uuid, want_archived boolean)
returns public.projects language plpgsql security definer set search_path = '' as $$
declare project_row public.projects;
begin
  select * into project_row from public.projects where id = project_uuid for update;
  if not found or (project_row.archived_at is not null) <> want_archived then
    raise exception 'PROJECT_NOT_FOUND';
  end if;
  perform app_private.crm_lock_active_department(project_row.department_id);
  return project_row;
end;
$$;

create or replace function app_private.crm_project_json(project_row public.projects) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('name', project_row.name, 'description', project_row.description,
    'ownerEmployeeId', project_row.owner_employee_id, 'status', project_row.status,
    'startDate', project_row.start_date, 'dueDate', project_row.due_date);
$$;

create or replace function app_private.crm_log_project(
  actor_id uuid, project_uuid uuid, activity text, old_json jsonb, new_json jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, old_values,
    new_values, created_by)
  values (actor_id, activity, 'projects', project_uuid, old_json, new_json, actor_id);
$$;

-- Đặt danh sách thành viên (luôn gồm chủ dự án). Chỉ người MỚI thêm phải đủ điều kiện (Q6): thành viên
-- cũ đã chuyển phòng vẫn giữ hoặc gỡ được. Ghi audit khi danh sách thực sự đổi.
create or replace function app_private.crm_put_project_members(
  project_row public.projects, actor_id uuid, employee_uuids uuid[]
) returns void language plpgsql security definer set search_path = '' as $$
declare old_ids uuid[]; new_ids uuid[]; employee_uuid uuid;
begin
  new_ids := app_private.crm_distinct_ids(coalesce(employee_uuids, '{}')
    || coalesce(array[project_row.owner_employee_id], '{}'));
  new_ids := array_remove(new_ids, null);
  old_ids := app_private.crm_distinct_ids(array(select employee_id from public.project_members
    where project_id = project_row.id));
  if new_ids = old_ids then return; end if;
  foreach employee_uuid in array new_ids loop
    if not (employee_uuid = any (old_ids)) then
      perform app_private.crm_assert_project_participant(project_row.department_id, employee_uuid);
    end if;
  end loop;
  delete from public.project_members where project_id = project_row.id and employee_id <> all (new_ids);
  insert into public.project_members (project_id, employee_id, created_by)
  select project_row.id, id, actor_id from unnest(new_ids) as id
  on conflict (project_id, employee_id) do nothing;
  perform app_private.crm_log_project(actor_id, project_row.id, 'project.members',
    jsonb_build_object('employeeIds', old_ids), jsonb_build_object('employeeIds', new_ids));
end;
$$;

-- Giá trị from / to của activity 'project_changed' (tên chụp lại lúc đổi, như cột của 'moved').
create or replace function app_private.crm_project_ref(project_uuid uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when project_uuid is null then null else
    (select jsonb_build_object('projectId', id, 'projectName', name)
     from public.projects where id = project_uuid) end;
$$;

-- BR-30: dự án gắn vào task phải còn hoạt động và cùng phòng với task.
create or replace function app_private.crm_assert_task_project(department_uuid uuid, project_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare project_department uuid;
begin
  if project_uuid is null then return; end if;
  select department_id into project_department from public.projects
  where id = project_uuid and archived_at is null;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if project_department <> department_uuid then raise exception 'PROJECT_NOT_IN_DEPARTMENT'; end if;
end;
$$;

-- Task được thêm vào / bỏ khỏi dự án → hiện trong lịch sử dự án.
create or replace function app_private.crm_log_project_task(
  actor_id uuid, old_project uuid, new_project uuid, task_uuid uuid, task_title text
) returns void language plpgsql security definer set search_path = '' as $$
declare task_json jsonb := jsonb_build_object('taskId', task_uuid, 'title', task_title);
begin
  if old_project is not distinct from new_project then return; end if;
  if old_project is not null then
    perform app_private.crm_log_project(actor_id, old_project, 'project.task_removed', task_json, null);
  end if;
  if new_project is not null then
    perform app_private.crm_log_project(actor_id, new_project, 'project.task_added', null, task_json);
  end if;
end;
$$;

-- ---------- RPC dự án ----------

create or replace function public.crm_create_project(
  actor_uuid uuid, department_uuid uuid, project_name text, project_description text, owner_uuid uuid,
  project_status text, project_start_date date, project_due_date date, member_uuids uuid[] default '{}'
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; project_row public.projects;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_active_department(department_uuid);
  if owner_uuid is not null then
    perform app_private.crm_assert_project_participant(department_uuid, owner_uuid);
  end if;
  insert into public.projects (department_id, name, description, owner_employee_id, status,
    start_date, due_date, created_by)
  values (department_uuid, btrim(project_name), nullif(btrim(project_description), ''), owner_uuid,
    coalesce(project_status, 'planning'), project_start_date, project_due_date, actor_id)
  returning * into project_row;
  perform app_private.crm_log_project(actor_id, project_row.id, 'project.create', null,
    app_private.crm_project_json(project_row) || jsonb_build_object('departmentId', department_uuid));
  perform app_private.crm_put_project_members(project_row, actor_id, member_uuids);
  return project_row.id;
end;
$$;

-- PATCH: chỉ đổi khoá có trong `changes` (name, description, ownerEmployeeId, status, startDate, dueDate);
-- null = xoá giá trị (trừ name, status). Không đổi phòng ban của dự án.
create or replace function public.crm_update_project(actor_uuid uuid, project_uuid uuid, changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.projects; new_row public.projects; owner_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  old_row := app_private.crm_lock_project(project_uuid, false);
  owner_uuid := (changes ->> 'ownerEmployeeId')::uuid;
  if changes ? 'ownerEmployeeId' and owner_uuid is distinct from old_row.owner_employee_id
    and owner_uuid is not null then
    perform app_private.crm_assert_project_participant(old_row.department_id, owner_uuid);
  end if;
  update public.projects set
    name = case when changes ? 'name' then btrim(changes ->> 'name') else name end,
    description = case when changes ? 'description'
      then nullif(btrim(changes ->> 'description'), '') else description end,
    owner_employee_id = case when changes ? 'ownerEmployeeId' then owner_uuid else owner_employee_id end,
    status = case when changes ? 'status' then changes ->> 'status' else status end,
    start_date = case when changes ? 'startDate' then (changes ->> 'startDate')::date else start_date end,
    due_date = case when changes ? 'dueDate' then (changes ->> 'dueDate')::date else due_date end
  where id = project_uuid
  returning * into new_row;
  -- Chủ dự án luôn là thành viên.
  if new_row.owner_employee_id is not null then
    insert into public.project_members (project_id, employee_id, created_by)
    values (project_uuid, new_row.owner_employee_id, actor_id)
    on conflict (project_id, employee_id) do nothing;
  end if;
  if app_private.crm_project_json(old_row) <> app_private.crm_project_json(new_row) then
    perform app_private.crm_log_project(actor_id, project_uuid, 'project.update',
      app_private.crm_project_json(old_row), app_private.crm_project_json(new_row));
  end if;
end;
$$;

create or replace function public.crm_set_project_members(
  actor_uuid uuid, project_uuid uuid, employee_uuids uuid[]
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; project_row public.projects;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  project_row := app_private.crm_lock_project(project_uuid, false);
  perform app_private.crm_put_project_members(project_row, actor_id, employee_uuids);
end;
$$;

-- Lưu trữ (không xoá): task vẫn giữ project_id, dự án ẩn khỏi danh sách và ô chọn dự án.
create or replace function public.crm_archive_project(actor_uuid uuid, project_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; project_row public.projects;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  project_row := app_private.crm_lock_project(project_uuid, false);
  update public.projects set archived_at = now() where id = project_uuid;
  perform app_private.crm_log_project(actor_id, project_uuid, 'project.archive', null,
    jsonb_build_object('name', project_row.name));
end;
$$;

-- Khôi phục: tên đã bị dự án khác dùng → vi phạm projects_department_name_key (API báo trùng tên).
create or replace function public.crm_restore_project(actor_uuid uuid, project_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; project_row public.projects;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  project_row := app_private.crm_lock_project(project_uuid, true);
  update public.projects set archived_at = null where id = project_uuid;
  perform app_private.crm_log_project(actor_id, project_uuid, 'project.restore', null,
    jsonb_build_object('name', project_row.name));
end;
$$;

-- ---------- Task gắn dự án ----------

-- Như bản 20261006090700 + project_uuid (BR-30). DROP đúng chữ ký cũ: PostgREST chọn hàm theo tên tham
-- số, hai bản cùng tồn tại sẽ gây nhầm / lỗi "could not choose the best candidate".
drop function if exists public.crm_create_task(uuid, uuid, text, text, uuid, text, date, date, uuid[]);

create or replace function public.crm_create_task(
  actor_uuid uuid, board_uuid uuid, task_title text, task_description text, assignee_uuid uuid,
  task_priority text, task_start_date date, task_due_date date, collaborator_uuids uuid[] default '{}',
  project_uuid uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; todo_column uuid; board_department uuid; task_row public.tasks;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_assert_board_writable(board_uuid);
  if assignee_uuid is null then raise exception 'ASSIGNEE_REQUIRED'; end if;
  perform app_private.crm_assert_board_member(board_uuid, assignee_uuid);
  select dd.department_id into board_department
  from public.boards b join public.department_dashboards dd on dd.id = b.dashboard_id
  where b.id = board_uuid;
  perform app_private.crm_assert_task_project(board_department, project_uuid);
  select id into todo_column from public.board_columns
  where board_id = board_uuid and status = 'todo' and is_default;
  insert into public.tasks (board_id, column_id, department_id, project_id, title, description, status,
    position, assignee_id, priority, start_date, due_date, created_by)
  values (board_uuid, todo_column, board_department, project_uuid, btrim(task_title),
    nullif(btrim(task_description), ''), 'todo',
    coalesce((select min(position) from public.tasks
      where column_id = todo_column and archived_at is null), 1024) - 1024,
    assignee_uuid, coalesce(task_priority, 'normal'), task_start_date, task_due_date, actor_id)
  returning * into task_row;
  perform app_private.crm_log_task(task_row.id, actor_id, 'created', null,
    jsonb_build_object('title', task_row.title));
  perform app_private.crm_log_task(task_row.id, actor_id, 'assigned', null,
    jsonb_build_object('assigneeId', assignee_uuid));
  perform app_private.crm_insert_collaborators(task_row, actor_id,
    app_private.crm_distinct_ids(collaborator_uuids));
  perform app_private.crm_log_collaborators(task_row.id, actor_id, '{}');
  perform app_private.crm_log_project_task(actor_id, null, project_uuid, task_row.id, task_row.title);
  return task_row.id;
end;
$$;

-- Như bản 20261006090700 + khoá projectId trong `changes` (null = bỏ khỏi dự án). Chữ ký không đổi.
create or replace function public.crm_update_task(actor_uuid uuid, task_uuid uuid, changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.tasks; new_row public.tasks; project_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  old_row := app_private.crm_lock_writable_task(task_uuid);
  if changes ? 'assigneeId' then
    if changes ->> 'assigneeId' is null then raise exception 'ASSIGNEE_REQUIRED'; end if;
    perform app_private.crm_assert_board_member(old_row.board_id, (changes ->> 'assigneeId')::uuid);
  end if;
  project_uuid := (changes ->> 'projectId')::uuid;
  if changes ? 'projectId' and project_uuid is distinct from old_row.project_id then
    perform app_private.crm_assert_task_project(old_row.department_id, project_uuid);
  end if;
  update public.tasks set
    title = case when changes ? 'title' then btrim(changes ->> 'title') else title end,
    description = case when changes ? 'description'
      then nullif(btrim(changes ->> 'description'), '') else description end,
    assignee_id = coalesce((changes ->> 'assigneeId')::uuid, assignee_id),
    priority = case when changes ? 'priority' then changes ->> 'priority' else priority end,
    start_date = case when changes ? 'startDate' then (changes ->> 'startDate')::date else start_date end,
    due_date = case when changes ? 'dueDate' then (changes ->> 'dueDate')::date else due_date end,
    project_id = case when changes ? 'projectId' then project_uuid else project_id end
  where id = task_uuid
  returning * into new_row;
  perform app_private.crm_log_task_changes(old_row, new_row, actor_id);
  perform app_private.crm_drop_collaborator(task_uuid, actor_id, new_row.assignee_id);
  if new_row.project_id is distinct from old_row.project_id then
    perform app_private.crm_log_task(task_uuid, actor_id, 'project_changed',
      app_private.crm_project_ref(old_row.project_id), app_private.crm_project_ref(new_row.project_id));
    perform app_private.crm_log_project_task(actor_id, old_row.project_id, new_row.project_id,
      task_uuid, new_row.title);
  end if;
end;
$$;

-- ---------- Quyền DB ----------

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- API chỉ đọc trực tiếp; mọi thao tác ghi qua RPC (ghi audit cùng giao dịch).
revoke all on public.projects, public.project_members from public, anon, authenticated, service_role;
grant select on public.projects, public.project_members to service_role;
revoke all on public.project_summaries, public.project_activity_feed, public.task_cards
  from public, anon, authenticated;
grant select on public.project_summaries, public.project_activity_feed, public.task_cards to service_role;

do $$
declare signature text;
begin
  foreach signature in array array[
    'app_private.crm_assert_project_participant(uuid, uuid)',
    'app_private.crm_lock_project(uuid, boolean)',
    'app_private.crm_project_json(public.projects)',
    'app_private.crm_log_project(uuid, uuid, text, jsonb, jsonb)',
    'app_private.crm_put_project_members(public.projects, uuid, uuid[])',
    'app_private.crm_project_ref(uuid)',
    'app_private.crm_assert_task_project(uuid, uuid)',
    'app_private.crm_log_project_task(uuid, uuid, uuid, uuid, text)'] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
  end loop;
  foreach signature in array array[
    'public.crm_create_project(uuid, uuid, text, text, uuid, text, date, date, uuid[])',
    'public.crm_update_project(uuid, uuid, jsonb)',
    'public.crm_set_project_members(uuid, uuid, uuid[])',
    'public.crm_archive_project(uuid, uuid)',
    'public.crm_restore_project(uuid, uuid)',
    'public.crm_create_task(uuid, uuid, text, text, uuid, text, date, date, uuid[], uuid)',
    'public.crm_update_task(uuid, uuid, jsonb)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261009090000_projects.sql')
on conflict (name) do nothing;

commit;
