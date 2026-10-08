-- BR-53 (sửa theo review L6): số việc đang mở và bàn giao chỉ tính việc trên Dashboard còn ghi được
-- (phòng ban chưa xoá, BR-06). Người nhận không thuộc board của một số việc → báo rõ việc nào, Dashboard
-- nào (detail JSON). crm_delete_employee trả số việc đang mở và số việc đã bàn giao thật.
-- Thay bản ở 20261006090800 (đã áp) bằng migration mới, không sửa file cũ.
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261007100000_task_trash.sql') then
    raise exception 'Chạy 20261007100000_task_trash.sql trước';
  end if;
end;
$$;

-- Việc đang mở của từng người trên Dashboard còn ghi được: nguồn duy nhất cho số đếm và bàn giao.
create or replace view public.open_assigned_tasks with (security_invoker = true) as
select t.id, t.assignee_id, t.board_id, t.title, dd.name as dashboard_name
from public.tasks t
join public.boards b on b.id = t.board_id
join public.department_dashboards dd on dd.id = b.dashboard_id
join public.departments d on d.id = dd.department_id
where t.status <> 'done' and t.archived_at is null and d.archived_at is null;

revoke all on public.open_assigned_tasks from public, anon, authenticated;
grant select on public.open_assigned_tasks to service_role;

-- Kiểm tra hết trước khi đổi: một việc bị chặn → không bàn giao việc nào, báo đủ danh sách bị chặn.
-- Đang là người phối hợp thì được gỡ khỏi phối hợp (BR-12).
create or replace function app_private.crm_hand_over_tasks(
  actor_id uuid, from_employee uuid, to_employee uuid
) returns integer language plpgsql security definer set search_path = '' as $$
declare handed_over integer := 0; blocked jsonb; task_row record;
begin
  perform 1 from public.employees where id = to_employee and archived_at is null;
  if not found then raise exception 'HANDOVER_EMPLOYEE_NOT_FOUND'; end if;

  select jsonb_agg(jsonb_build_object('taskId', o.id, 'title', o.title,
      'dashboardName', o.dashboard_name) order by o.dashboard_name, o.title)
  into blocked
  from public.open_assigned_tasks o
  where o.assignee_id = from_employee
    and not app_private.crm_is_board_member(o.board_id, to_employee);
  if blocked is not null then
    raise exception 'HANDOVER_EMPLOYEE_NOT_IN_BOARD' using detail = blocked::text;
  end if;

  for task_row in select t.id from public.tasks t
    where t.id in (select o.id from public.open_assigned_tasks o where o.assignee_id = from_employee)
    order by t.id for update
  loop
    update public.tasks set assignee_id = to_employee where id = task_row.id;
    perform app_private.crm_log_task(task_row.id, actor_id, 'assignee_changed',
      jsonb_build_object('assigneeId', from_employee), jsonb_build_object('assigneeId', to_employee));
    perform app_private.crm_drop_collaborator(task_row.id, actor_id, to_employee);
    handed_over := handed_over + 1;
  end loop;
  return handed_over;
end;
$$;
revoke all on function app_private.crm_hand_over_tasks(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

-- Đổi kiểu trả về (void → jsonb) phải xoá bản cũ trước.
drop function if exists public.crm_delete_employee(uuid, uuid, uuid, uuid);

create or replace function public.crm_delete_employee(
  actor_uuid uuid, employee_uuid uuid, new_manager_uuid uuid, handover_employee_uuid uuid default null
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid; target_account uuid; target_role text; target_user uuid; target_status text;
  managed_department uuid; open_count integer; handed_over integer := 0;
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
  if handover_employee_uuid is not null then
    handed_over := app_private.crm_hand_over_tasks(actor_id, employee_uuid, handover_employee_uuid);
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
      'openTaskCount', open_count, 'handedOverTaskCount', handed_over),
    actor_id);
  return jsonb_build_object('openTaskCount', open_count, 'handedOverTaskCount', handed_over);
end;
$$;

revoke all on function public.crm_delete_employee(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_delete_employee(uuid, uuid, uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261008090000_handover_writable_boards.sql')
on conflict (name) do nothing;

commit;
