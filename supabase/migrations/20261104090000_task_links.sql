-- Link kết quả / tài liệu của công việc (chủ dự án chốt 03/11/2026): mỗi task tối đa 10 link (OneDrive, Google
-- Docs, bài viết, file .docx…), tên hiển thị tuỳ chọn, nhập được ở mọi trạng thái.
-- - task_links: xoá mềm (deleted_at); chỉ http(s) — link mở bằng thẻ <a>, không cho javascript: hay data:.
-- - RPC thêm / xoá ghi task_activities cùng giao dịch (dùng lại action attachment_added / attachment_removed,
--   to_value / from_value có linkId, linkUrl, linkTitle). Quyền sửa task (canEdit) kiểm tra ở API; RPC chặn board chỉ đọc.
-- - View task_cards thêm cột link_count ở cuối (biểu tượng link trên thẻ board).
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261103090000_issued_assets.sql') then
    raise exception 'Chạy 20261103090000_issued_assets.sql trước';
  end if;
end;
$$;

create table if not exists public.task_links (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete restrict,
  url text not null constraint task_links_url_check
    check (url ~* '^https?://[^[:space:]]+$' and char_length(url) <= 2000),
  title text constraint task_links_title_check
    check (title = btrim(title) and char_length(title) between 1 and 120),
  created_by uuid not null references public.app_accounts(id) on delete restrict,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists task_links_task_idx on public.task_links (task_id, created_at) where deleted_at is null;

drop trigger if exists task_links_updated_at on public.task_links;
create trigger task_links_updated_at before update on public.task_links
  for each row execute function app_private.set_updated_at();

-- Nối link_count vào cuối task_cards (create or replace chỉ cho thêm cột ở cuối).
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
  t.project_id, pr.name as project_name,
  (select count(*) from public.task_links l where l.task_id = t.id and l.deleted_at is null)::int as link_count
from public.tasks t
join public.employees e on e.id = t.assignee_id
left join public.projects pr on pr.id = t.project_id
where t.archived_at is null;

-- Thêm link vào cuối danh sách; tối đa 10 link chưa xoá mỗi task (khoá task nên hai người thêm cùng lúc không vượt).
create or replace function public.crm_add_task_link(
  actor_uuid uuid, task_uuid uuid, link_url text, link_title text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; new_row public.task_links;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_writable_task(task_uuid);
  if (select count(*) from public.task_links where task_id = task_uuid and deleted_at is null) >= 10 then
    raise exception 'TASK_LINK_LIMIT';
  end if;
  insert into public.task_links (task_id, url, title, created_by)
  values (task_uuid, btrim(link_url), nullif(btrim(link_title), ''), actor_id)
  returning * into new_row;
  perform app_private.crm_log_task(task_uuid, actor_id, 'attachment_added', null,
    jsonb_build_object('linkId', new_row.id, 'linkUrl', new_row.url, 'linkTitle', new_row.title));
  return new_row.id;
end;
$$;

-- Xoá mềm: link ẩn khỏi task, lịch sử giữ trong task_activities.
create or replace function public.crm_remove_task_link(actor_uuid uuid, task_uuid uuid, link_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; removed public.task_links;
begin
  actor_id := app_private.crm_work_actor(actor_uuid);
  perform app_private.crm_lock_writable_task(task_uuid);
  update public.task_links set deleted_at = now()
  where id = link_uuid and task_id = task_uuid and deleted_at is null
  returning * into removed;
  if not found then raise exception 'TASK_LINK_NOT_FOUND'; end if;
  perform app_private.crm_log_task(task_uuid, actor_id, 'attachment_removed',
    jsonb_build_object('linkId', removed.id, 'linkUrl', removed.url, 'linkTitle', removed.title), null);
end;
$$;

-- ---------- Quyền DB ----------

alter table public.task_links enable row level security;
-- API chỉ đọc trực tiếp; thêm / xoá qua RPC (ghi activity cùng giao dịch).
revoke all on public.task_links from public, anon, authenticated, service_role;
grant select on public.task_links to service_role;

do $$
declare signature text;
begin
  foreach signature in array array[
    'public.crm_add_task_link(uuid, uuid, text, text)',
    'public.crm_remove_task_link(uuid, uuid, uuid)'] loop
    execute format('revoke all on function %s from public, anon, authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261104090000_task_links.sql')
on conflict (name) do nothing;

commit;
