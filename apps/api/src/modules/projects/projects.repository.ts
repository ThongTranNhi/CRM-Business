import type { Env } from '../../config/env';
import { rangeParams, toPage, type Page } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import { PROJECT_ERRORS } from '../../lib/project-errors';
import type {
  CreateProjectInput,
  ListProjectsQuery,
  ProjectStatus,
  ProjectSummary,
  UpdateProjectInput,
} from './projects.types';

interface SummaryRow {
  id: string;
  department_id: string;
  department_name: string;
  department_archived_at: string | null;
  dashboard_id: string | null;
  board_id: string | null;
  name: string;
  description: string | null;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  archived_at: string | null;
  created_at: string;
  owner_employee_id: string | null;
  owner_name: string | null;
  task_total: number;
  task_done: number;
  task_overdue: number;
  member_count: number;
}
const SUMMARY_SELECT =
  'id,department_id,department_name,department_archived_at,dashboard_id,board_id,name,description,status,' +
  'start_date,due_date,archived_at,created_at,owner_employee_id,owner_name,task_total,task_done,' +
  'task_overdue,member_count';

/** BR-31: % = task xong / task chưa lưu trữ, làm tròn; chưa có task → null. */
const percentOf = (done: number, total: number) =>
  total === 0 ? null : Math.round((done / total) * 100);

const mapSummary = (row: SummaryRow): ProjectSummary => ({
  id: row.id,
  name: row.name,
  description: row.description,
  status: row.status,
  startDate: row.start_date,
  dueDate: row.due_date,
  archivedAt: row.archived_at,
  createdAt: row.created_at,
  department: { id: row.department_id, name: row.department_name },
  departmentArchived: row.department_archived_at !== null,
  dashboardId: row.dashboard_id,
  boardId: row.board_id,
  owner:
    row.owner_employee_id && row.owner_name
      ? { id: row.owner_employee_id, fullName: row.owner_name }
      : null,
  progress: {
    total: row.task_total,
    done: row.task_done,
    overdue: row.task_overdue,
    percent: percentOf(row.task_done, row.task_total),
  },
  memberCount: row.member_count,
});

/**
 * null: xem mọi dự án. Ngược lại: dự án của phòng người xem, hoặc dự án người xem là thành viên NHƯNG chỉ khi
 * còn trong board của phòng dự án (`boardIds`) — chuyển phòng / bị bỏ khỏi board là không thấy nữa.
 */
export type ProjectScope = {
  departmentId: string | null;
  projectIds: string[];
  boardIds: string[];
} | null;

export async function listSummaries(
  env: Env,
  query: ListProjectsQuery,
  scope: ProjectScope,
): Promise<Page<ProjectSummary>> {
  const pagination = { page: query.page, pageSize: query.pageSize };
  const visible = scope && [
    ...(scope.departmentId ? [`department_id.eq.${scope.departmentId}`] : []),
    ...(scope.projectIds.length > 0 && scope.boardIds.length > 0
      ? [`and(id.in.(${scope.projectIds.join(',')}),board_id.in.(${scope.boardIds.join(',')}))`]
      : []),
  ];
  if (visible && visible.length === 0) return toPage([], 0, pagination);
  const params = new URLSearchParams({
    select: SUMMARY_SELECT,
    order: 'name,id',
    archived_at: query.status === 'archived' ? 'not.is.null' : 'is.null',
    ...rangeParams(pagination),
  });
  if (visible) params.set('or', `(${visible.join(',')})`);
  if (query.departmentId) params.set('department_id', `eq.${query.departmentId}`);
  if (query.status && query.status !== 'archived') params.set('status', `eq.${query.status}`);
  if (query.q) params.set('name', `ilike.*${query.q}*`);
  const { rows, total } = await supabaseList<SummaryRow>(
    env,
    `/rest/v1/project_summaries?${params}`,
  );
  return toPage(rows.map(mapSummary), total, pagination);
}

/** Một dự án, kể cả đã lưu trữ (để khôi phục). */
export async function findSummary(env: Env, projectId: string): Promise<ProjectSummary | null> {
  const params = new URLSearchParams({ select: SUMMARY_SELECT, id: `eq.${projectId}`, limit: '1' });
  const [row] = await supabaseRequest<SummaryRow[]>(env, `/rest/v1/project_summaries?${params}`);
  return row ? mapSummary(row) : null;
}

/** Id các thành viên của một dự án. */
export async function listMemberIds(env: Env, projectId: string): Promise<string[]> {
  const params = new URLSearchParams({ select: 'employee_id', project_id: `eq.${projectId}` });
  const rows = await supabaseRequest<{ employee_id: string }[]>(
    env,
    `/rest/v1/project_members?${params}`,
  );
  return rows.map((row) => row.employee_id);
}

/** Dự án một nhân viên đang tham gia (người phòng khác được mời vẫn thấy dự án mình). */
export async function listProjectIdsOf(env: Env, employeeId: string): Promise<string[]> {
  const params = new URLSearchParams({ select: 'project_id', employee_id: `eq.${employeeId}` });
  const rows = await supabaseRequest<{ project_id: string }[]>(
    env,
    `/rest/v1/project_members?${params}`,
  );
  return rows.map((row) => row.project_id);
}

/**
 * Số dự án còn ghi được một nhân viên đang làm chủ — BR-53 bàn giao khi xoá. View owned_writable_projects
 * (20261012090000) bỏ dự án đã lưu trữ và dự án của phòng đã xoá.
 */
export async function countOwnedProjects(env: Env, employeeId: string): Promise<number> {
  const params = new URLSearchParams({
    select: 'id',
    owner_employee_id: `eq.${employeeId}`,
    limit: '1',
  });
  const { total } = await supabaseList<{ id: string }>(
    env,
    `/rest/v1/owned_writable_projects?${params}`,
  );
  return total;
}

/** Ô "Dự án" khi tạo / sửa task: dự án chưa lưu trữ của phòng (BR-30). */
export function listProjectOptions(env: Env, departmentId: string) {
  const params = new URLSearchParams({
    select: 'id,name',
    department_id: `eq.${departmentId}`,
    archived_at: 'is.null',
    order: 'name,id',
    limit: '200',
  });
  return supabaseRequest<{ id: string; name: string }[]>(env, `/rest/v1/projects?${params}`);
}

// ---------- Ghi: mỗi thao tác một RPC (ghi audit cùng giao dịch) ----------

export const createProject = (env: Env, actorId: string, input: CreateProjectInput) =>
  callRpc<string>(env, {
    name: 'crm_create_project',
    args: {
      actor_uuid: actorId,
      department_uuid: input.departmentId,
      project_name: input.name,
      project_description: input.description,
      owner_uuid: input.ownerEmployeeId,
      project_status: input.status,
      project_start_date: input.startDate,
      project_due_date: input.dueDate,
      member_uuids: input.memberIds,
    },
    errors: PROJECT_ERRORS,
  });

/** `changes` giữ nguyên khoá có mặt: RPC chỉ đổi những khoá đó. */
export const updateProject = (
  env: Env,
  actorId: string,
  projectId: string,
  changes: UpdateProjectInput,
) =>
  callRpc(env, {
    name: 'crm_update_project',
    args: { actor_uuid: actorId, project_uuid: projectId, changes },
    errors: PROJECT_ERRORS,
  });

export const setMembers = (env: Env, actorId: string, projectId: string, employeeIds: string[]) =>
  callRpc(env, {
    name: 'crm_set_project_members',
    args: { actor_uuid: actorId, project_uuid: projectId, employee_uuids: employeeIds },
    errors: PROJECT_ERRORS,
  });

export const archiveProject = (env: Env, actorId: string, projectId: string) =>
  callRpc(env, {
    name: 'crm_archive_project',
    args: { actor_uuid: actorId, project_uuid: projectId },
    errors: PROJECT_ERRORS,
  });

export const restoreProject = (env: Env, actorId: string, projectId: string) =>
  callRpc(env, {
    name: 'crm_restore_project',
    args: { actor_uuid: actorId, project_uuid: projectId },
    errors: PROJECT_ERRORS,
  });
