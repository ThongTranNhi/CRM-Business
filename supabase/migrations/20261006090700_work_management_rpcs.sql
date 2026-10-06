-- RPC Work Management Đợt 2: mỗi thao tác ghi là một giao dịch, ghi task_activities cùng lúc (BR-20, BR-21).
-- Phân quyền theo dữ liệu (permission-model.md) nằm ở service API, dựa trên crm_work_access;
-- RPC kiểm tra tài khoản còn hoạt động, toàn vẹn dữ liệu và BR-04, BR-06, BR-11 → BR-14, BR-19.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090600_work_management_tables.sql') then
    raise exception 'Chạy 20261006090600_work_management_tables.sql trước';
  end if;
end;
$$;

-- ---------- Hàm nội bộ ----------

create or replace function app_private.crm_work_actor(actor_uuid uuid) returns uuid
language sql security definer set search_path = '' as $$
  select app_private.crm_actor(actor_uuid,
    array['super_admin', 'hr_admin', 'department_manager', 'team_leader', 'employee']);
$$;

-- BR-06: phòng ban đã xoá → Dashboard chỉ đọc.
create or replace function app_private.crm_assert_board_writable(board_uuid uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare department_archived timestamptz;
begin
  select d.archived_at into department_archived
  from public.boards b
  join public.department_dashboards dd on dd.id = b.dashboard_id
  join public.departments d on d.id = dd.department_id
  where b.id = board_uuid;
  if not found then raise exception 'BOARD_NOT_FOUND'; end if;
  if department_archived is not null then raise exception 'DASHBOARD_READ_ONLY'; end if;
end;
$$;

-- Người phụ trách / phối hợp: nhân viên đang làm, thuộc phòng của board hoặc được mời vào board.
create or replace function app_private.crm_assert_board_member(board_uuid uuid, employee_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not exists (
    select 1 from public.employees e
    join public.boards b on b.id = board_uuid
    join public.department_dashboards dd on dd.id = b.dashboard_id
    where e.id = employee_uuid and e.archived_at is null and (e.department_id = dd.department_id
      or exists (select 1 from public.board_members m
        where m.board_id = board_uuid and m.employee_id = employee_uuid))
  ) then
    raise exception 'EMPLOYEE_NOT_IN_BOARD';
  end if;
end;
$$;

create or replace function app_private.crm_lock_writable_task(task_uuid uuid)
returns public.tasks language plpgsql security definer set search_path = '' as $$
declare task_row public.tasks;
begin
  select * into task_row from public.tasks where id = task_uuid and archived_at is null for update;
  if not found then raise exception 'TASK_NOT_FOUND'; end if;
  perform app_private.crm_assert_board_writable(task_row.board_id);
  return task_row;
end;
$$;

create or replace function app_private.crm_log_task(
  task_uuid uuid, actor_id uuid, activity text, from_json jsonb, to_json jsonb
) returns void language sql security definer set search_path = '' as $$
  insert into public.task_activities (task_id, actor_id, action, from_value, to_value)
  values (task_uuid, actor_id, activity, from_json, to_json);
$$;

-- drag-and-drop.md: thả giữa A và B → (A + B) / 2; đầu cột → đầu - 1024; cuối cột → cuối + 1024.
create or replace function app_private.crm_renumber_column(board_uuid uuid, column_status text)
returns void language sql security definer set search_path = '' as $$
  update public.tasks t set position = r.rank * 1024
  from (select id, row_number() over (order by position, created_at, id) as rank
    from public.tasks where board_id = board_uuid and status = column_status and archived_at is null) r
  where t.id = r.id;
$$;

create or replace function app_private.crm_neighbor_position(
  board_uuid uuid, column_status text, task_uuid uuid, neighbor_uuid uuid
) returns numeric language plpgsql security definer set search_path = '' as $$
declare neighbor_position numeric;
begin
  if neighbor_uuid is null then return null; end if;
  select position into neighbor_position from public.tasks
  where id = neighbor_uuid and id <> task_uuid and board_id = board_uuid
    and status = column_status and archived_at is null;
  if not found then raise exception 'INVALID_POSITION'; end if;
  return neighbor_position;
end;
$$;

-- previous = task ngay trên chỗ thả, next = task ngay dưới. Không truyền cả hai → cuối cột.
create or replace function app_private.crm_task_position(
  task_row public.tasks, column_status text, previous_uuid uuid, next_uuid uuid
) returns numeric language plpgsql security definer set search_path = '' as $$
declare previous_position numeric; next_position numeric;
begin
  if previous_uuid is null and next_uuid is null then
    select max(position) + 1024 into previous_position from public.tasks
    where board_id = task_row.board_id and status = column_status
      and archived_at is null and id <> task_row.id;
    return coalesce(previous_position, 0);
  end if;
  previous_position := app_private.crm_neighbor_position(task_row.board_id, column_status, task_row.id, previous_uuid);
  next_position := app_private.crm_neighbor_position(task_row.board_id, column_status, task_row.id, next_uuid);
  if next_position <= previous_position then raise exception 'INVALID_POSITION'; end if;
  if next_position - previous_position < 0.001 then
    perform app_private.crm_renumber_column(task_row.board_id, column_status);
    previous_position := app_private.crm_neighbor_position(task_row.board_id, column_status, task_row.id, previous_uuid);
    next_position := app_private.crm_neighbor_position(task_row.board_id, column_status, task_row.id, next_uuid);
  end if;
  return case
    when previous_position is null then next_position - 1024
    when next_position is null then previous_position + 1024
    else (previous_position + next_position) / 2 end;
end;
$$;

-- ---------- Đọc: dữ liệu để service quyết định quyền ----------

-- Truyền board_uuid hoặc task_uuid. null = board/task không tồn tại hoặc tài khoản không hoạt động.
create or replace function public.crm_work_access(user_uuid uuid, board_uuid uuid, task_uuid uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  with actor as (
    select a.id, a.role, e.id as employee_id, e.department_id
    from public.app_accounts a
    left join public.employees e on e.account_id = a.id and e.archived_at is null
    where a.auth_user_id = user_uuid and a.status = 'active'
  ), target as (
    select b.id as board_id, dd.department_id, d.manager_employee_id, d.archived_at,
      t.id as task_id, t.assignee_id, t.created_by
    from public.boards b
    join public.department_dashboards dd on dd.id = b.dashboard_id
    join public.departments d on d.id = dd.department_id
    left join public.tasks t on t.id = task_uuid and t.board_id = b.id and t.archived_at is null
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
    'isAssignee', coalesce(actor.employee_id = target.assignee_id, false),
    'isCollaborator', exists (select 1 from public.task_collaborators c
      where c.task_id = target.task_id and c.employee_id = actor.employee_id),
    'isCreator', coalesce(actor.id = target.created_by, false))
  from actor cross join target;
$$;

-- BR-03, BR-41: Dashboard người xem được thấy. include_all do service quyết định (Super Admin, HR Admin).
create or replace function public.crm_list_dashboards(user_uuid uuid, include_all boolean)
returns setof public.dashboard_summaries language sql stable security definer set search_path = '' as $$
  select s.* from public.dashboard_summaries s
  where s.department_archived_at is null and (include_all or exists (
    select 1 from public.app_accounts a
    join public.employees e on e.account_id = a.id and e.archived_at is null
    where a.auth_user_id = user_uuid and (e.department_id = s.department_id or exists (
      select 1 from public.board_members m where m.board_id = s.board_id and m.employee_id = e.id))))
  order by s.department_name, s.id;
$$;

-- ---------- Ghi ----------

-- BR-02, BR-04, BR-10: Dashboard + board + 3 cột trong một giao dịch; phòng đã có thì trả Dashboard cũ.
create or replace function public.crm_create_dashboard(
  actor_uuid uuid, department_uuid uuid, dashboard_name text, dashboard_description text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; existing_uuid uuid; dashboard_uuid uuid; board_uuid uuid; department_name text;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin', 'department_manager']);
  perform app_private.crm_lock_active_department(department_uuid);
  select id into existing_uuid from public.department_dashboards where department_id = department_uuid;
  if existing_uuid is not null then
    return jsonb_build_object('dashboardId', existing_uuid, 'created', false);
  end if;
  select name into department_name from public.departments where id = department_uuid;
  insert into public.department_dashboards (department_id, name, description, created_by)
  values (department_uuid, coalesce(nullif(btrim(dashboard_name), ''), left(department_name, 120)),
    nullif(btrim(dashboard_description), ''), actor_id)
  returning id into dashboard_uuid;
  insert into public.boards (dashboard_id, created_by) values (dashboard_uuid, actor_id)
  returning id into board_uuid;
  insert into public.board_columns (board_id, status, name, position) values
    (board_uuid, 'todo', 'VIỆC CẦN LÀM', 1),
    (board_uuid, 'in_progress', 'VIỆC ĐANG LÀM', 2),
    (board_uuid, 'done', 'ĐÃ HOÀN THÀNH', 3);
  return jsonb_build_object('dashboardId', dashboard_uuid, 'created', true);
end;
$$;

-- BR-11: department_id lấy từ Dashboard, không nhận từ client. Task mới nằm đầu cột Việc cần làm.
create or replace function public.crm_create_task(
  actor_uuid uuid, board_uuid uuid, task_title text, task_description text,
  assignee_uuid uuid, task_priority text, task_due_date date
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; task_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_assert_board_writable(board_uuid);
  if assignee_uuid is null then raise exception 'ASSIGNEE_REQUIRED'; end if;
  perform app_private.crm_assert_board_member(board_uuid, assignee_uuid);
  insert into public.tasks (board_id, department_id, title, description, position, assignee_id,
    priority, due_date, created_by)
  select board_uuid, dd.department_id, btrim(task_title), nullif(btrim(task_description), ''),
    coalesce((select min(position) from public.tasks
      where board_id = board_uuid and status = 'todo' and archived_at is null), 1024) - 1024,
    assignee_uuid, coalesce(task_priority, 'normal'), task_due_date, actor_id
  from public.boards b join public.department_dashboards dd on dd.id = b.dashboard_id
  where b.id = board_uuid
  returning id into task_uuid;
  perform app_private.crm_log_task(task_uuid, actor_id, 'created', null,
    jsonb_build_object('title', btrim(task_title)));
  perform app_private.crm_log_task(task_uuid, actor_id, 'assigned', null,
    jsonb_build_object('assigneeId', assignee_uuid));
  return task_uuid;
end;
$$;

-- BR-13, BR-14, BR-15: đổi cột / thứ tự; position tính từ task lân cận, không nhận từ client.
create or replace function public.crm_move_task(
  actor_uuid uuid, task_uuid uuid, to_status text, previous_task_uuid uuid, next_task_uuid uuid
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.tasks; new_row public.tasks; new_position numeric;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  if to_status is null or to_status not in ('todo', 'in_progress', 'done') then
    raise exception 'INVALID_STATUS';
  end if;
  old_row := app_private.crm_lock_writable_task(task_uuid);
  -- Tính trước UPDATE: crm_task_position có thể đánh số lại cả cột (gồm chính task này).
  new_position := app_private.crm_task_position(old_row, to_status, previous_task_uuid, next_task_uuid);
  update public.tasks set status = to_status, position = new_position,
    started_at = case when to_status = 'in_progress' then coalesce(started_at, now()) else started_at end,
    completed_at = case when to_status <> 'done' then null else coalesce(completed_at, now()) end,
    completed_by = case when to_status <> 'done' then null else coalesce(completed_by, actor_id) end
  where id = task_uuid
  returning * into new_row;
  if old_row.status <> to_status then
    perform app_private.crm_log_task(task_uuid, actor_id, 'moved',
      jsonb_build_object('status', old_row.status), jsonb_build_object('status', to_status));
    if to_status = 'done' then
      perform app_private.crm_log_task(task_uuid, actor_id, 'completed', null, null);
    elsif old_row.status = 'done' then
      perform app_private.crm_log_task(task_uuid, actor_id, 'reopened', null, null);
    end if;
  end if;
  return jsonb_build_object('id', new_row.id, 'status', new_row.status, 'position', new_row.position,
    'startedAt', new_row.started_at, 'completedAt', new_row.completed_at,
    'completedBy', new_row.completed_by);
end;
$$;

-- PATCH /api/tasks/:id — chỉ đổi khoá có trong `changes` (title, description, assigneeId, priority,
-- startDate, dueDate). Đổi người phụ trách thành người đang phối hợp → bỏ khỏi phối hợp (BR-12).
create or replace function public.crm_update_task(actor_uuid uuid, task_uuid uuid, changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.tasks; new_row public.tasks;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  old_row := app_private.crm_lock_writable_task(task_uuid);
  if changes ? 'assigneeId' then
    if changes ->> 'assigneeId' is null then raise exception 'ASSIGNEE_REQUIRED'; end if;
    perform app_private.crm_assert_board_member(old_row.board_id, (changes ->> 'assigneeId')::uuid);
    delete from public.task_collaborators
    where task_id = task_uuid and employee_id = (changes ->> 'assigneeId')::uuid;
  end if;
  update public.tasks set
    title = case when changes ? 'title' then btrim(changes ->> 'title') else title end,
    description = case when changes ? 'description'
      then nullif(btrim(changes ->> 'description'), '') else description end,
    assignee_id = coalesce((changes ->> 'assigneeId')::uuid, assignee_id),
    priority = case when changes ? 'priority' then changes ->> 'priority' else priority end,
    start_date = case when changes ? 'startDate' then (changes ->> 'startDate')::date else start_date end,
    due_date = case when changes ? 'dueDate' then (changes ->> 'dueDate')::date else due_date end
  where id = task_uuid
  returning * into new_row;
  if new_row.title <> old_row.title then
    perform app_private.crm_log_task(task_uuid, actor_id, 'title_changed',
      jsonb_build_object('title', old_row.title), jsonb_build_object('title', new_row.title));
  end if;
  if new_row.assignee_id <> old_row.assignee_id then
    perform app_private.crm_log_task(task_uuid, actor_id, 'assignee_changed',
      jsonb_build_object('assigneeId', old_row.assignee_id), jsonb_build_object('assigneeId', new_row.assignee_id));
  end if;
  if new_row.priority <> old_row.priority then
    perform app_private.crm_log_task(task_uuid, actor_id, 'priority_changed',
      jsonb_build_object('priority', old_row.priority), jsonb_build_object('priority', new_row.priority));
  end if;
  if new_row.due_date is distinct from old_row.due_date then
    perform app_private.crm_log_task(task_uuid, actor_id, 'due_date_changed',
      jsonb_build_object('dueDate', old_row.due_date), jsonb_build_object('dueDate', new_row.due_date));
  end if;
end;
$$;

-- PUT /api/tasks/:id/collaborators: thay toàn bộ danh sách; trigger chặn trùng người phụ trách (BR-12).
create or replace function public.crm_set_task_collaborators(
  actor_uuid uuid, task_uuid uuid, employee_uuids uuid[]
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; task_row public.tasks; old_ids uuid[]; new_ids uuid[]; employee_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  task_row := app_private.crm_lock_writable_task(task_uuid);
  select coalesce(array_agg(employee_id order by employee_id), '{}') into old_ids
  from public.task_collaborators where task_id = task_uuid;
  new_ids := array(select distinct id from unnest(coalesce(employee_uuids, '{}')) as id order by id);
  if new_ids = old_ids then return; end if;
  foreach employee_uuid in array new_ids loop
    perform app_private.crm_assert_board_member(task_row.board_id, employee_uuid);
  end loop;
  delete from public.task_collaborators where task_id = task_uuid and employee_id <> all (new_ids);
  insert into public.task_collaborators (task_id, employee_id, created_by)
  select task_uuid, id, actor_id from unnest(new_ids) as id
  on conflict (task_id, employee_id) do nothing;
  perform app_private.crm_log_task(task_uuid, actor_id, 'collaborators_changed',
    jsonb_build_object('employeeIds', old_ids), jsonb_build_object('employeeIds', new_ids));
end;
$$;

-- BR-17, BR-20: thêm / sửa (nội dung, đã xong) / xoá mềm mục checklist, ghi checklist_changed.
create or replace function public.crm_add_checklist_item(actor_uuid uuid, task_uuid uuid, item_content text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; item_uuid uuid;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_writable_task(task_uuid);
  insert into public.task_checklist_items (task_id, content, position, created_by)
  select task_uuid, btrim(item_content), coalesce(max(position), 0) + 1024, actor_id
  from public.task_checklist_items where task_id = task_uuid and deleted_at is null
  returning id into item_uuid;
  perform app_private.crm_log_task(task_uuid, actor_id, 'checklist_changed', null,
    jsonb_build_object('itemId', item_uuid, 'content', btrim(item_content), 'isDone', false));
  return item_uuid;
end;
$$;

create or replace function public.crm_update_checklist_item(
  actor_uuid uuid, task_uuid uuid, item_uuid uuid, item_content text, item_done boolean
) returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_item public.task_checklist_items; new_item public.task_checklist_items;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_writable_task(task_uuid);
  select * into old_item from public.task_checklist_items
  where id = item_uuid and task_id = task_uuid and deleted_at is null for update;
  if not found then raise exception 'CHECKLIST_ITEM_NOT_FOUND'; end if;
  update public.task_checklist_items set content = coalesce(btrim(item_content), content),
    is_done = coalesce(item_done, is_done)
  where id = item_uuid returning * into new_item;
  if (new_item.content, new_item.is_done) is distinct from (old_item.content, old_item.is_done) then
    perform app_private.crm_log_task(task_uuid, actor_id, 'checklist_changed',
      jsonb_build_object('itemId', item_uuid, 'content', old_item.content, 'isDone', old_item.is_done),
      jsonb_build_object('itemId', item_uuid, 'content', new_item.content, 'isDone', new_item.is_done));
  end if;
end;
$$;

create or replace function public.crm_remove_checklist_item(actor_uuid uuid, task_uuid uuid, item_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; removed_content text;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_writable_task(task_uuid);
  update public.task_checklist_items set deleted_at = now()
  where id = item_uuid and task_id = task_uuid and deleted_at is null
  returning content into removed_content;
  if not found then raise exception 'CHECKLIST_ITEM_NOT_FOUND'; end if;
  perform app_private.crm_log_task(task_uuid, actor_id, 'checklist_changed',
    jsonb_build_object('itemId', item_uuid, 'content', removed_content), null);
end;
$$;

-- BR-19, BR-22: lưu trữ task (không xoá), ghi activity và audit log.
create or replace function public.crm_archive_task(actor_uuid uuid, task_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; task_row public.tasks;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  task_row := app_private.crm_lock_writable_task(task_uuid);
  update public.tasks set archived_at = now() where id = task_uuid;
  perform app_private.crm_log_task(task_uuid, actor_id, 'archived', null, null);
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
  values (actor_id, 'task.archive', 'tasks', task_uuid,
    jsonb_build_object('title', task_row.title, 'boardId', task_row.board_id), actor_id);
end;
$$;

do $$
declare signature text;
begin
  foreach signature in array array[
    'app_private.crm_work_actor(uuid)', 'app_private.crm_assert_board_writable(uuid)',
    'app_private.crm_assert_board_member(uuid, uuid)', 'app_private.crm_lock_writable_task(uuid)',
    'app_private.crm_log_task(uuid, uuid, text, jsonb, jsonb)',
    'app_private.crm_renumber_column(uuid, text)',
    'app_private.crm_neighbor_position(uuid, text, uuid, uuid)',
    'app_private.crm_task_position(public.tasks, text, uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated, service_role', signature);
  end loop;
  foreach signature in array array[
    'public.crm_work_access(uuid, uuid, uuid)', 'public.crm_list_dashboards(uuid, boolean)',
    'public.crm_create_dashboard(uuid, uuid, text, text)',
    'public.crm_create_task(uuid, uuid, text, text, uuid, text, date)',
    'public.crm_move_task(uuid, uuid, text, uuid, uuid)',
    'public.crm_update_task(uuid, uuid, jsonb)',
    'public.crm_set_task_collaborators(uuid, uuid, uuid[])',
    'public.crm_add_checklist_item(uuid, uuid, text)',
    'public.crm_update_checklist_item(uuid, uuid, uuid, text, boolean)',
    'public.crm_remove_checklist_item(uuid, uuid, uuid)',
    'public.crm_archive_task(uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261006090700_work_management_rpcs.sql')
on conflict (name) do nothing;

commit;
