import type { Env } from '../../config/env';
import { callRpc, supabaseRequest } from '../../lib/supabase';
import { workAccessSchema } from '../../lib/work-access';
import { WORK_ERRORS } from '../../lib/work-errors';
import { createdDashboardSchema } from './department-dashboards.schema';
import type {
  CreateDashboardInput,
  DashboardSummary,
  DepartmentPreview,
  MemberRecord,
} from './department-dashboards.types';

interface SummaryRow {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  department_name: string;
  department_archived_at: string | null;
  board_id: string;
  open_count: number;
  in_progress_count: number;
  overdue_count: number;
}
const SUMMARY_SELECT =
  'id,name,description,department_id,department_name,department_archived_at,board_id,open_count,in_progress_count,overdue_count';

const mapSummary = (row: SummaryRow): DashboardSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  department: { id: row.department_id, name: row.department_name },
  departmentArchived: row.department_archived_at !== null,
  boardId: row.board_id,
  counts: { open: row.open_count, inProgress: row.in_progress_count, overdue: row.overdue_count },
});

interface MemberRow {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_path: string | null;
  auth_user_id: string | null;
  department_id: string | null;
  department_manager_id: string | null;
  department_manager_name: string | null;
}
const MEMBER_SELECT =
  'id,full_name,job_title,avatar_path,auth_user_id,department_id,department_manager_id,department_manager_name';

const mapMember = (row: MemberRow): MemberRecord => ({
  id: row.id,
  fullName: row.full_name,
  jobTitle: row.job_title,
  avatarPath: row.avatar_path,
  authUserId: row.auth_user_id,
  departmentId: row.department_id,
  managerId: row.department_manager_id,
  managerName: row.department_manager_name,
});

/** BR-03, BR-41: Dashboard người xem được thấy (ẩn phòng đã xoá). */
export async function listVisible(env: Env, userId: string, includeAll: boolean) {
  const rows = await callRpc<SummaryRow[]>(env, {
    name: 'crm_list_dashboards',
    args: { user_uuid: userId, include_all: includeAll },
  });
  return rows.map(mapSummary);
}

export async function findSummary(env: Env, id: string): Promise<DashboardSummary | null> {
  const params = new URLSearchParams({ select: SUMMARY_SELECT, id: `eq.${id}`, limit: '1' });
  const rows = await supabaseRequest<SummaryRow[]>(env, `/rest/v1/dashboard_summaries?${params}`);
  return rows[0] ? mapSummary(rows[0]) : null;
}

async function listActiveEmployees(env: Env, filter: Record<string, string>) {
  const params = new URLSearchParams({ select: MEMBER_SELECT, order: 'full_name,id', ...filter });
  const rows = await supabaseRequest<MemberRow[]>(env, `/rest/v1/active_employees?${params}`);
  return rows.map(mapMember);
}

/** Thành viên board: nhân viên đang làm của phòng + người được mời (board_members). */
export function listBoardMembers(env: Env, departmentId: string, invitedIds: string[]) {
  const conditions = [`department_id.eq.${departmentId}`];
  if (invitedIds.length > 0) conditions.push(`id.in.(${invitedIds.join(',')})`);
  return listActiveEmployees(env, { or: `(${conditions.join(',')})` });
}

const PREVIEW_SIZE = 4;

interface PreviewRow {
  id: string;
  manager_employee_id: string | null;
  manager_name: string | null;
  member_count: number;
  employees: {
    id: string;
    full_name: string;
    avatar_path: string | null;
    app_accounts: { auth_user_id: string } | null;
  }[];
}

const PREVIEW_SELECT =
  'id,manager_employee_id,manager_name,member_count,' +
  'employees!employees_department_id_fkey(id,full_name,avatar_path,' +
  'app_accounts!employees_account_id_fkey(auth_user_id))';

const mapPreview = (row: PreviewRow): DepartmentPreview => ({
  manager:
    row.manager_employee_id && row.manager_name
      ? { id: row.manager_employee_id, fullName: row.manager_name }
      : null,
  memberCount: row.member_count,
  members: row.employees.map((employee) => ({
    id: employee.id,
    fullName: employee.full_name,
    avatarPath: employee.avatar_path,
    authUserId: employee.app_accounts?.auth_user_id ?? null,
  })),
});

/**
 * departmentId → trưởng phòng, số người, tối đa PREVIEW_SIZE người. Một truy vấn, không tải cả phòng:
 * nhúng employees qua khoá ngoại employees.department_id, chỉ người chưa nghỉ.
 */
export async function listDepartmentPreviews(env: Env, departmentIds: string[]) {
  const params = new URLSearchParams({
    select: PREVIEW_SELECT,
    id: `in.(${departmentIds.join(',')})`,
    'employees.archived_at': 'is.null',
    'employees.order': 'full_name,id',
    'employees.limit': String(PREVIEW_SIZE),
  });
  const rows = await supabaseRequest<PreviewRow[]>(env, `/rest/v1/active_departments?${params}`);
  return new Map(rows.map((row) => [row.id, mapPreview(row)]));
}

async function selectColumn(env: Env, path: string, column: string): Promise<string[]> {
  const rows = await supabaseRequest<Record<string, string>[]>(env, path);
  return rows.flatMap((row) => (row[column] ? [row[column]] : []));
}

export const listInvitedEmployeeIds = (env: Env, boardId: string) =>
  selectColumn(
    env,
    `/rest/v1/board_members?select=employee_id&board_id=eq.${boardId}`,
    'employee_id',
  );

export const listInvitedBoardIds = (env: Env, employeeId: string) =>
  selectColumn(
    env,
    `/rest/v1/board_members?select=board_id&employee_id=eq.${employeeId}`,
    'board_id',
  );

export async function findWorkAccess(env: Env, userId: string, boardId: string) {
  const result = await callRpc<unknown>(env, {
    name: 'crm_work_access',
    args: { user_uuid: userId, board_uuid: boardId, task_uuid: null },
  });
  return workAccessSchema.nullable().parse(result);
}

export async function createDashboard(env: Env, actorId: string, input: CreateDashboardInput) {
  const result = await callRpc<unknown>(env, {
    name: 'crm_create_dashboard',
    args: {
      actor_uuid: actorId,
      department_uuid: input.departmentId,
      dashboard_name: input.name ?? null,
      dashboard_description: input.description ?? null,
    },
    errors: WORK_ERRORS,
  });
  return createdDashboardSchema.parse(result);
}
