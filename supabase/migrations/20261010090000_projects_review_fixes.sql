-- Đợt 3 S1 — sửa theo review: (1) đổi chủ dự án làm chủ mới tự vào project_members → ghi audit
-- 'project.members'; (2) crm_assert_task_project khoá đọc dự án (FOR SHARE) để không gắn task vào dự án đang
-- bị lưu trữ ở giao dịch khác. Chỉ thay thân hàm, không đổi chữ ký / quyền.
begin;

create or replace function app_private.crm_assert_task_project(department_uuid uuid, project_uuid uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare project_department uuid;
begin
  if project_uuid is null then return; end if;
  -- FOR SHARE: crm_archive_project (UPDATE) phải chờ giao dịch gắn task xong, và ngược lại.
  select department_id into project_department from public.projects
  where id = project_uuid and archived_at is null
  for share;
  if not found then raise exception 'PROJECT_NOT_FOUND'; end if;
  if project_department <> department_uuid then raise exception 'PROJECT_NOT_IN_DEPARTMENT'; end if;
end;
$$;

-- PATCH: chỉ đổi khoá có trong `changes` (name, description, ownerEmployeeId, status, startDate, dueDate);
-- null = xoá giá trị (trừ name, status). Không đổi phòng ban của dự án.
create or replace function public.crm_update_project(actor_uuid uuid, project_uuid uuid, changes jsonb)
returns void language plpgsql security definer set search_path = '' as $$
declare actor_id uuid; old_row public.projects; new_row public.projects; owner_uuid uuid; old_ids uuid[];
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
  if app_private.crm_project_json(old_row) <> app_private.crm_project_json(new_row) then
    perform app_private.crm_log_project(actor_id, project_uuid, 'project.update',
      app_private.crm_project_json(old_row), app_private.crm_project_json(new_row));
  end if;
  -- Chủ dự án luôn là thành viên; chủ mới được thêm → ghi audit như khi sửa thành viên.
  if new_row.owner_employee_id is not null and not exists (
    select 1 from public.project_members
    where project_id = project_uuid and employee_id = new_row.owner_employee_id
  ) then
    old_ids := app_private.crm_distinct_ids(array(select employee_id from public.project_members
      where project_id = project_uuid));
    insert into public.project_members (project_id, employee_id, created_by)
    values (project_uuid, new_row.owner_employee_id, actor_id);
    perform app_private.crm_log_project(actor_id, project_uuid, 'project.members',
      jsonb_build_object('employeeIds', old_ids),
      jsonb_build_object('employeeIds',
        app_private.crm_distinct_ids(old_ids || array[new_row.owner_employee_id])));
  end if;
end;
$$;

insert into app_private.applied_migrations (name)
values ('20261010090000_projects_review_fixes.sql')
on conflict (name) do nothing;

commit;
