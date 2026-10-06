-- Work Management Đợt 2: Dashboard phòng ban, board 3 cột, task, người phối hợp, checklist, bình luận,
-- lịch sử hoạt động (BR-01 → BR-21). Người phụ trách / phối hợp / thành viên board → employees;
-- người tạo, người hoàn thành, người thao tác → app_accounts (cùng kiểu audit_logs).
-- Ghi chỉ qua RPC / API (service_role); RLS bật, không policy = mặc định từ chối.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090500_super_admin_titles.sql') then
    raise exception 'Chạy 20261006090500_super_admin_titles.sql trước';
  end if;
end;
$$;

create or replace function app_private.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  NEW.updated_at := clock_timestamp();
  return NEW;
end;
$$;
revoke all on function app_private.set_updated_at() from public, anon, authenticated;

-- BR-04: department_id UNIQUE — mỗi phòng ban tối đa 1 Dashboard chính.
create table if not exists public.department_dashboards (
  id uuid primary key default gen_random_uuid(),
  department_id uuid not null unique references public.departments(id) on delete restrict,
  name text not null constraint department_dashboards_name_check
    check (name = btrim(name) and char_length(name) between 1 and 120),
  description text constraint department_dashboards_description_check
    check (char_length(description) <= 1000),
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.boards (
  id uuid primary key default gen_random_uuid(),
  dashboard_id uuid not null unique references public.department_dashboards(id) on delete restrict,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- BR-10: cột kiểu Trello. `status` là nhóm trạng thái của cột (todo / in_progress / done). Đợt 2 chỉ có
-- 3 cột mặc định (is_default); thêm cột tuỳ chỉnh: Đợt 3. Tên cột lưu ở DB, giao diện không hard-code.
create table if not exists public.board_columns (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete restrict,
  status text not null constraint board_columns_status_check
    check (status in ('todo', 'in_progress', 'done')),
  name text not null constraint board_columns_name_check
    check (name = btrim(name) and char_length(name) between 1 and 60),
  position smallint not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint board_columns_position_unique unique (board_id, position),
  -- Đích của khoá ngoại ghép từ tasks: status của task luôn khớp nhóm của cột.
  constraint board_columns_id_board_status_unique unique (id, board_id, status)
);
-- Mỗi board có đúng 1 cột mặc định cho mỗi nhóm trạng thái (task mới vào cột mặc định nhóm todo).
create unique index if not exists board_columns_default_status_unique
  on public.board_columns (board_id, status) where is_default;

-- Người ngoài phòng được mời vào Dashboard (BR-41). Giao diện quản lý: Đợt 3.
create table if not exists public.board_members (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (board_id, employee_id)
);
create index if not exists board_members_employee_idx on public.board_members (employee_id);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards(id) on delete restrict,
  column_id uuid not null,
  department_id uuid not null references public.departments(id) on delete restrict,
  project_id uuid, -- Đợt 3: khoá ngoại tới projects
  title text not null constraint tasks_title_check
    check (title = btrim(title) and char_length(title) between 1 and 200),
  description text constraint tasks_description_check check (char_length(description) <= 5000),
  status text not null default 'todo' constraint tasks_status_check
    check (status in ('todo', 'in_progress', 'done')),
  position numeric not null,
  assignee_id uuid not null references public.employees(id) on delete restrict, -- BR-12
  priority text not null default 'normal' constraint tasks_priority_check
    check (priority in ('low', 'normal', 'high', 'urgent')),
  start_date date,
  due_date date,
  started_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references public.app_accounts(id) on delete restrict,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Tên check cố định: API map tên → mã lỗi tiếng Việt.
  constraint tasks_date_range_check
    check (start_date is null or due_date is null or start_date <= due_date),
  -- BR-14: đã hoàn thành ⇔ có completed_at và completed_by.
  constraint tasks_done_completed_at_check check ((status = 'done') = (completed_at is not null)),
  constraint tasks_completed_by_check check ((completed_at is null) = (completed_by is null)),
  -- Cột của task phải thuộc cùng board và status = nhóm trạng thái của cột (không cần trigger).
  constraint tasks_column_status_fk foreign key (column_id, board_id, status)
    references public.board_columns (id, board_id, status) on delete restrict
);
create index if not exists tasks_column_position_idx
  on public.tasks (column_id, position) where archived_at is null;
create index if not exists tasks_board_status_idx
  on public.tasks (board_id, status) where archived_at is null;
create index if not exists tasks_assignee_idx on public.tasks (assignee_id);
create index if not exists tasks_department_idx on public.tasks (department_id);
create index if not exists tasks_due_date_idx on public.tasks (due_date);
create index if not exists tasks_project_idx on public.tasks (project_id);

create table if not exists public.task_collaborators (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  employee_id uuid not null references public.employees(id) on delete restrict,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, employee_id)
);
create index if not exists task_collaborators_employee_idx on public.task_collaborators (employee_id);

-- BR-12: người phụ trách không đồng thời là người phối hợp.
create or replace function app_private.reject_assignee_as_collaborator() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from public.tasks where id = NEW.task_id and assignee_id = NEW.employee_id) then
    raise exception 'COLLABORATOR_IS_ASSIGNEE';
  end if;
  return NEW;
end;
$$;
revoke all on function app_private.reject_assignee_as_collaborator() from public, anon, authenticated;

create table if not exists public.task_checklist_items (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  content text not null constraint task_checklist_items_content_check
    check (content = btrim(content) and char_length(content) between 1 and 500),
  is_done boolean not null default false,
  position numeric not null,
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_checklist_items_task_idx
  on public.task_checklist_items (task_id, position) where deleted_at is null;

-- Trả lời 1 cấp: parent_id trỏ tới bình luận gốc (crm_add_comment chặn trả lời vào một trả lời).
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  parent_id uuid references public.task_comments(id) on delete restrict,
  author_id uuid not null references public.app_accounts(id) on delete restrict,
  body text not null constraint task_comments_body_check
    check (body = btrim(body) and char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_comments_task_idx on public.task_comments (task_id, created_at);
create index if not exists task_comments_parent_idx on public.task_comments (task_id, parent_id);

-- BR-21: chỉ INSERT. Danh sách hành động: docs/features/work-management/activity-log.md.
create table if not exists public.task_activities (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  actor_id uuid not null references public.app_accounts(id) on delete restrict,
  action text not null check (action in ('created', 'assigned', 'assignee_changed',
    'collaborators_changed', 'due_date_changed', 'priority_changed', 'checklist_changed',
    'attachment_added', 'attachment_removed', 'moved', 'completed', 'reopened', 'archived',
    'title_changed')),
  from_value jsonb,
  to_value jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_activities_task_idx on public.task_activities (task_id, created_at desc);

do $$
declare table_name text;
begin
  foreach table_name in array array['department_dashboards', 'boards', 'board_columns',
    'board_members', 'tasks', 'task_collaborators', 'task_checklist_items', 'task_comments'] loop
    execute format('drop trigger if exists %I on public.%I', table_name || '_updated_at', table_name);
    execute format('create trigger %I before update on public.%I for each row
      execute function app_private.set_updated_at()', table_name || '_updated_at', table_name);
  end loop;
end;
$$;

drop trigger if exists task_collaborators_not_assignee on public.task_collaborators;
create trigger task_collaborators_not_assignee before insert or update on public.task_collaborators
  for each row execute function app_private.reject_assignee_as_collaborator();
drop trigger if exists task_activities_immutable on public.task_activities;
create trigger task_activities_immutable before update or delete or truncate on public.task_activities
  for each statement execute function app_private.reject_log_mutation();

-- View đọc (security_invoker, chỉ service_role SELECT): mỗi màn hình tải bằng 1 truy vấn, không N+1.
-- BR-16: quá hạn tính khi đọc theo ngày giờ Việt Nam, không lưu cờ.
create or replace view public.dashboard_summaries with (security_invoker = true) as
select dd.id, dd.name, dd.description, dd.department_id, d.name as department_name,
  d.archived_at as department_archived_at, b.id as board_id, dd.created_at,
  count(t.id) filter (where t.status <> 'done')::int as open_count,
  count(t.id) filter (where t.status = 'in_progress')::int as in_progress_count,
  count(t.id) filter (where t.status <> 'done'
    and t.due_date < (now() at time zone 'Asia/Ho_Chi_Minh')::date)::int as overdue_count
from public.department_dashboards dd
join public.departments d on d.id = dd.department_id
join public.boards b on b.dashboard_id = dd.id
left join public.tasks t on t.board_id = b.id and t.archived_at is null
group by dd.id, d.id, b.id;

-- Tên hiển thị của người thao tác (app_accounts); CEO / Master có thể chưa có hồ sơ nhân viên.
create or replace view public.account_profiles with (security_invoker = true) as
select a.id as account_id, coalesce(e.full_name, a.username) as display_name,
  e.id as employee_id, e.avatar_path
from public.app_accounts a
left join public.employees e on e.account_id = a.id;

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
  (select count(*) from public.task_comments m where m.task_id = t.id)::int as comment_count
from public.tasks t
join public.employees e on e.id = t.assignee_id
where t.archived_at is null;

create or replace view public.task_activity_feed with (security_invoker = true) as
select v.id, v.task_id, v.action, v.from_value, v.to_value, v.created_at, v.actor_id,
  p.display_name as actor_name
from public.task_activities v
left join public.account_profiles p on p.account_id = v.actor_id;

create or replace view public.task_comment_feed with (security_invoker = true) as
select m.id, m.task_id, m.parent_id, m.body, m.created_at, m.author_id,
  p.display_name as author_name, p.avatar_path as author_avatar_path
from public.task_comments m
left join public.account_profiles p on p.account_id = m.author_id;

revoke all on public.dashboard_summaries, public.account_profiles, public.task_cards,
  public.task_activity_feed, public.task_comment_feed from public, anon, authenticated;
grant select on public.dashboard_summaries, public.account_profiles, public.task_cards,
  public.task_activity_feed, public.task_comment_feed to service_role;

alter table public.department_dashboards enable row level security;
alter table public.boards enable row level security;
alter table public.board_columns enable row level security;
alter table public.board_members enable row level security;
alter table public.tasks enable row level security;
alter table public.task_collaborators enable row level security;
alter table public.task_checklist_items enable row level security;
alter table public.task_comments enable row level security;
alter table public.task_activities enable row level security;

-- API chỉ đọc trực tiếp; mọi thao tác ghi qua RPC 20261006090700 (ghi activity cùng giao dịch).
revoke all on public.department_dashboards, public.boards, public.board_columns,
  public.board_members, public.tasks, public.task_collaborators, public.task_checklist_items,
  public.task_comments, public.task_activities from public, anon, authenticated, service_role;
grant select on public.department_dashboards, public.boards, public.board_columns,
  public.board_members, public.tasks, public.task_collaborators, public.task_checklist_items,
  public.task_comments, public.task_activities to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090600_work_management_tables.sql')
on conflict (name) do nothing;

commit;
