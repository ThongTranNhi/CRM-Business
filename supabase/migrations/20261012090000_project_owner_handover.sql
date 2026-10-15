-- Đợt 3 S1, BR-53: xoá nhân viên đang làm chủ dự án → người nhận bàn giao việc nhận luôn quyền chủ dự án
-- (dự án chưa lưu trữ, phòng ban chưa xoá). Người nhận không đủ điều kiện với một dự án (Q6) → báo rõ dự án
-- nào, không đổi gì. crm_delete_employee trả thêm số dự án đang làm chủ và số dự án đã bàn giao.
-- Thay bản ở 20261008090000 (đã áp) bằng migration mới, không sửa file cũ. Chưa áp.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261011090000_my_tasks.sql') then
    raise exception 'Chạy 20261011090000_my_tasks.sql trước';
  end if;
end;
$$;

-- Dự án còn ghi được của từng chủ dự án: nguồn duy nhất cho số đếm và bàn giao (như open_assigned_tasks).
create or replace view public.owned_writable_projects with (security_invoker = true) as
select p.id, p.owner_employee_id, p.department_id, p.name, d.name as department_name
from public.projects p
join public.departments d on d.id = p.department_id
where p.archived_at is null and d.archived_at is null and p.owner_employee_id is not null;

revoke all on public.owned_writable_projects from public, anon, authenticated;
grant select on public.owned_writable_projects to service_role;

-- Q6 dạng đúng / sai (cùng điều kiện với crm_assert_project_participant) để liệt kê dự án bị chặn.
create or replace function app_private.crm_is_project_participant(department_uuid uuid, employee_uuid uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.employees e
    where e.id = employee_uuid and e.archived_at is null and (e.department_id = department_uuid
      or exists (select 1 from public.board_members m
        join public.boards b on b.id = m.board_id
        join public.department_dashboards dd on dd.id = b.dashboard_id
        where dd.department_id = department_uuid and m.employee_id = e.id)));
$$;
revoke all on function app_private.crm_is_project_participant(uuid, uuid)
  from public, anon, authenticated, service_role;

-- Kiểm tra hết trước khi đổi: một dự án bị chặn → không bàn giao gì, báo đủ danh sách bị chặn.
-- Như PATCH đổi chủ (20261010090000): ghi 'project.update'; chủ mới chưa là thành viên → thêm và ghi
-- 'project.members'. Người bị xoá vẫn nằm trong thành viên (lịch sử), như thành viên nghỉ việc khác.
create or replace function app_private.crm_hand_over_projects(
  actor_id uuid, from_employee uuid, to_employee uuid
) returns integer language plpgsql security definer set search_path = '' as $$
declare handed_over integer := 0; blocked jsonb; old_row public.projects; new_row public.projects;
  old_ids uuid[];
begin
  select jsonb_agg(jsonb_build_object('projectId', o.id, 'name', o.name,
      'departmentName', o.department_name) order by o.department_name, o.name)
  into blocked
  from public.owned_writable_projects o
  where o.owner_employee_id = from_employee
    and not app_private.crm_is_project_participant(o.department_id, to_employee);
  if blocked is not null then
    raise exception 'HANDOVER_EMPLOYEE_NOT_PROJECT_ELIGIBLE' using detail = blocked::text;
  end if;

  for old_row in select p.* from public.projects p
    where p.id in (select o.id from public.owned_writable_projects o
      where o.owner_employee_id = from_employee)
    order by p.id for update
  loop
    update public.projects set owner_employee_id = to_employee where id = old_row.id
    returning * into new_row;
    perform app_private.crm_log_project(actor_id, old_row.id, 'project.update',
      app_private.crm_project_json(old_row), app_private.crm_project_json(new_row));
    if not exists (select 1 from public.project_members
      where project_id = old_row.id and employee_id = to_employee) then
      old_ids := app_private.crm_distinct_ids(array(select employee_id from public.project_members
        where project_id = old_row.id));
      insert into public.project_members (project_id, employee_id, created_by)
      values (old_row.id, to_employee, actor_id);
      perform app_private.crm_log_project(actor_id, old_row.id, 'project.members',
        jsonb_build_object('employeeIds', old_ids),
        jsonb_build_object('employeeIds', app_private.crm_distinct_ids(old_ids || array[to_employee])));
    end if;
    handed_over := handed_over + 1;
  end loop;
  return handed_over;
end;
$$;
revoke all on function app_private.crm_hand_over_projects(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

-- Như bản 20261008090000, thêm bàn giao dự án (cùng người nhận, cùng giao dịch).
create or replace function public.crm_delete_employee(
  actor_uuid uuid, employee_uuid uuid, new_manager_uuid uuid, handover_employee_uuid uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid; target_account uuid; target_role text; target_user uuid; target_status text;
  managed_department uuid; open_count integer; handed_over integer := 0;
  owned_count integer; handed_over_projects integer := 0;
begin
  actor_id := app_private.crm_actor(actor_uuid, array['super_admin']);
  select e.account_id, a.role, a.auth_user_id, a.status
  into target_account, target_role, target_user, target_status
  from public.employees e left join public.app_accounts a on a.id = e.account_id
  where e.id = employee_uuid and e.archived_at is null for update of e;
  if not found then raise exception 'EMPLOYEE_NOT_FOUND'; end if;
  if target_account = actor_id then raise exception 'CANNOT_DELETE_SELF'; end if;
  if target_role = 'super_admin' then raise exception 'CANNOT_DELETE_ADMIN'; end if;
  if new_manager_uuid = employee_uuid then raise exception 'INVALID_REPLACEMENT_MANAGER'; end if;
  if handover_employee_uuid = employee_uuid then raise exception 'INVALID_HANDOVER_EMPLOYEE'; end if;

  select id into managed_department from public.departments
  where manager_employee_id = employee_uuid and archived_at is null for update;
  if managed_department is not null then
    update public.departments set manager_employee_id = null where id = managed_department;
    if new_manager_uuid is not null then
      perform app_private.crm_assign_manager(managed_department, new_manager_uuid);
    end if;
  end if;

  select count(*) into open_count from public.open_assigned_tasks where assignee_id = employee_uuid;
  select count(*) into owned_count from public.owned_writable_projects
  where owner_employee_id = employee_uuid;
  if handover_employee_uuid is not null then
    -- crm_hand_over_tasks kiểm tra người nhận còn làm việc (HANDOVER_EMPLOYEE_NOT_FOUND).
    handed_over := app_private.crm_hand_over_tasks(actor_id, employee_uuid, handover_employee_uuid);
    handed_over_projects :=
      app_private.crm_hand_over_projects(actor_id, employee_uuid, handover_employee_uuid);
  end if;

  update public.employees set archived_at = now() where id = employee_uuid;
  if target_account is not null then
    update public.app_accounts set status = 'disabled' where id = target_account;
    delete from auth.sessions where user_id = target_user;
  end if;
  insert into public.audit_logs (actor_account_id, action, resource_type, resource_id, new_values, created_by)
  values (actor_id, 'employee.delete', 'employees', employee_uuid,
    jsonb_build_object('managedDepartmentId', managed_department, 'newManagerId', new_manager_uuid,
      'previousAccountStatus', target_status, 'handoverEmployeeId', handover_employee_uuid,
      'openTaskCount', open_count, 'handedOverTaskCount', handed_over,
      'ownedProjectCount', owned_count, 'handedOverProjectCount', handed_over_projects),
    actor_id);
  return jsonb_build_object('openTaskCount', open_count, 'handedOverTaskCount', handed_over,
    'ownedProjectCount', owned_count, 'handedOverProjectCount', handed_over_projects);
end;
$$;

revoke all on function public.crm_delete_employee(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_delete_employee(uuid, uuid, uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261012090000_project_owner_handover.sql')
on conflict (name) do nothing;

commit;
