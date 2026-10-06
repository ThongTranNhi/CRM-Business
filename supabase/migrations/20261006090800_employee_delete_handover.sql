-- BR-53: xoá nhân viên kèm bàn giao việc đang mở (tuỳ chọn) cho người khác.
-- Thay crm_delete_employee (20261006090400) bằng bản thêm tham số handover_employee_uuid (mặc định null:
-- API cũ gọi 3 tham số vẫn chạy). Bỏ qua bàn giao → việc giữ nguyên, giao diện cảnh báo "đã nghỉ".
begin;

do $$
begin
  if not exists (select 1 from app_private.applied_migrations
    where name = '20261006090700_work_management_rpcs.sql') then
    raise exception 'Chạy 20261006090700_work_management_rpcs.sql trước';
  end if;
end;
$$;

-- Việc đang mở của người nghỉ → người nhận; bỏ người nhận khỏi danh sách phối hợp (BR-12).
create or replace function app_private.crm_hand_over_tasks(
  actor_id uuid, from_employee uuid, to_employee uuid
) returns integer language plpgsql security definer set search_path = '' as $$
declare handed_over integer;
begin
  perform 1 from public.employees where id = to_employee and archived_at is null;
  if not found then raise exception 'HANDOVER_EMPLOYEE_NOT_FOUND'; end if;
  delete from public.task_collaborators c using public.tasks t
  where c.task_id = t.id and c.employee_id = to_employee
    and t.assignee_id = from_employee and t.status <> 'done' and t.archived_at is null;
  with moved as (
    update public.tasks set assignee_id = to_employee
    where assignee_id = from_employee and status <> 'done' and archived_at is null
    returning id
  ), logged as (
    insert into public.task_activities (task_id, actor_id, action, from_value, to_value)
    select id, actor_id, 'assignee_changed', jsonb_build_object('assigneeId', from_employee),
      jsonb_build_object('assigneeId', to_employee)
    from moved
    returning 1
  )
  select count(*) into handed_over from logged;
  return handed_over;
end;
$$;
revoke all on function app_private.crm_hand_over_tasks(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;

drop function if exists public.crm_delete_employee(uuid, uuid, uuid);

create or replace function public.crm_delete_employee(
  actor_uuid uuid, employee_uuid uuid, new_manager_uuid uuid, handover_employee_uuid uuid default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  actor_id uuid; target_account uuid; target_role text; target_user uuid; target_status text;
  managed_department uuid; handed_over integer := 0;
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
      'handedOverTaskCount', handed_over),
    actor_id);
end;
$$;

revoke all on function public.crm_delete_employee(uuid, uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.crm_delete_employee(uuid, uuid, uuid, uuid) to service_role;

insert into app_private.applied_migrations (name)
values ('20261006090800_employee_delete_handover.sql')
on conflict (name) do nothing;

commit;
