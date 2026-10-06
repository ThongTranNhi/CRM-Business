import type { Env } from '../../config/env';
import { DIRECTORY_ERRORS, departmentNameExists } from '../../lib/directory-errors';
import { rangeParams, toPage, type Page } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import type { AvatarOwner } from '../users/users.types';
import type {
  AddMemberInput,
  CreateDepartmentInput,
  DepartmentListItem,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from './departments.types';

// Hai yêu cầu tạo cùng tên tới cùng lúc: unique index là chốt chặn cuối.
const ERRORS = { ...DIRECTORY_ERRORS, '23505': departmentNameExists };

// Dashboard chính của phòng (BR-04, department_id UNIQUE → một object hoặc null) nhúng cùng truy vấn.
const DASHBOARD_EMBED = 'department_dashboards(id)';

interface DashboardEmbed {
  department_dashboards: { id: string } | null;
}

interface ActiveDepartmentRow extends DashboardEmbed {
  id: string;
  name: string;
  manager_employee_id: string | null;
  manager_name: string | null;
  member_count: number;
}
const ACTIVE_SELECT = `id,name,manager_employee_id,manager_name,member_count,${DASHBOARD_EMBED}`;

function mapActive(row: ActiveDepartmentRow): DepartmentListItem {
  return {
    id: row.id,
    name: row.name,
    manager:
      row.manager_employee_id && row.manager_name
        ? { id: row.manager_employee_id, fullName: row.manager_name }
        : null,
    memberCount: row.member_count,
    archivedAt: null,
    dashboardId: row.department_dashboards?.id ?? null,
  };
}

/**
 * `withoutDashboard`: chỉ phòng chưa có Dashboard, lọc ở DB (anti-join qua embed) và trả hết, không
 * phân trang — số phòng ban nhỏ, modal Tạo Dashboard cần đủ danh sách.
 */
export async function listActive(
  env: Env,
  query: ListDepartmentsQuery,
): Promise<Page<DepartmentListItem>> {
  const params = new URLSearchParams({ select: ACTIVE_SELECT, order: 'name,id' });
  if (query.withoutDashboard) params.set('department_dashboards', 'is.null');
  else for (const [key, value] of Object.entries(rangeParams(query))) params.set(key, value);
  if (query.q) params.set('name', `ilike.*${query.q}*`);
  const { rows, total } = await supabaseList<ActiveDepartmentRow>(
    env,
    `/rest/v1/active_departments?${params}`,
  );
  const items = rows.map(mapActive);
  if (query.withoutDashboard) return toPage(items, total, { page: 1, pageSize: items.length });
  return toPage(items, total, query);
}

export async function listDeleted(
  env: Env,
  query: ListDepartmentsQuery,
): Promise<Page<DepartmentListItem>> {
  const params = new URLSearchParams({
    select: `id,name,archived_at,${DASHBOARD_EMBED}`,
    archived_at: 'not.is.null',
    order: 'archived_at.desc,id',
    ...rangeParams(query),
  });
  if (query.q) params.set('name', `ilike.*${query.q}*`);
  const { rows, total } = await supabaseList<
    DashboardEmbed & { id: string; name: string; archived_at: string }
  >(env, `/rest/v1/departments?${params}`);
  const items = rows.map((row) => ({
    id: row.id,
    name: row.name,
    manager: null,
    memberCount: 0,
    archivedAt: row.archived_at,
    dashboardId: row.department_dashboards?.id ?? null,
  }));
  return toPage(items, total, query);
}

export async function findActive(env: Env, id: string): Promise<DepartmentListItem | null> {
  const params = new URLSearchParams({ select: ACTIVE_SELECT, id: `eq.${id}`, limit: '1' });
  const rows = await supabaseRequest<ActiveDepartmentRow[]>(
    env,
    `/rest/v1/active_departments?${params}`,
  );
  return rows[0] ? mapActive(rows[0]) : null;
}

export interface MemberRecord extends AvatarOwner {
  fullName: string;
  jobTitle: string | null;
}

export async function listMembers(env: Env, departmentId: string): Promise<MemberRecord[]> {
  const params = new URLSearchParams({
    select: 'id,full_name,job_title,avatar_path,auth_user_id',
    department_id: `eq.${departmentId}`,
    order: 'full_name,id',
    limit: '500',
  });
  const rows = await supabaseRequest<
    {
      id: string;
      full_name: string;
      job_title: string | null;
      avatar_path: string | null;
      auth_user_id: string | null;
    }[]
  >(env, `/rest/v1/active_employees?${params}`);
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    jobTitle: row.job_title,
    avatarPath: row.avatar_path,
    authUserId: row.auth_user_id,
  }));
}

export const createDepartment = (env: Env, actorId: string, input: CreateDepartmentInput) =>
  callRpc<string>(env, {
    name: 'crm_create_department',
    args: { actor_uuid: actorId, department_name: input.name, manager_uuid: input.managerId },
    errors: ERRORS,
  });

export const updateDepartment = (
  env: Env,
  actorId: string,
  change: { id: string } & UpdateDepartmentInput,
) =>
  callRpc(env, {
    name: 'crm_update_department',
    args: {
      actor_uuid: actorId,
      department_uuid: change.id,
      department_name: change.name ?? null,
      manager_uuid: change.managerId ?? null,
      change_manager: change.managerId !== undefined,
    },
    errors: ERRORS,
  });

export const moveEmployee = (
  env: Env,
  actorId: string,
  move: { departmentId: string } & AddMemberInput,
) =>
  callRpc(env, {
    name: 'crm_move_employee',
    args: {
      actor_uuid: actorId,
      employee_uuid: move.employeeId,
      department_uuid: move.departmentId,
      replacement_manager_uuid: move.replacementManagerId,
    },
    errors: ERRORS,
  });

export const deleteDepartment = (
  env: Env,
  actorId: string,
  target: { id: string; receivingDepartmentId: string | null },
) =>
  callRpc<number>(env, {
    name: 'crm_delete_department',
    args: {
      actor_uuid: actorId,
      department_uuid: target.id,
      receiving_uuid: target.receivingDepartmentId,
    },
    errors: ERRORS,
  });

export const restoreDepartment = (env: Env, actorId: string, id: string) =>
  callRpc(env, {
    name: 'crm_restore_department',
    args: { actor_uuid: actorId, department_uuid: id },
    errors: ERRORS,
  });
