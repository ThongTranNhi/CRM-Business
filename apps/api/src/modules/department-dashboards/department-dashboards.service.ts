import type { Env } from '../../config/env';
import { forbidden } from '../../lib/app-error';
import { assertRole, type RequestScope } from '../../lib/request-scope';
import { boardPermissions, canCreateDashboard, type BoardViewer } from '../../lib/work-access';
import { dashboardAlreadyExists, dashboardNotFound } from '../../lib/work-errors';
import { getEmployeeSummary } from '../auth/auth.service';
import { getAvatarUrls } from '../users/users.service';
import * as dashboardsRepository from './department-dashboards.repository';
import type {
  CreateDashboardInput,
  DashboardCard,
  DashboardDetail,
  DashboardSummary,
  MemberRecord,
  PersonRef,
} from './department-dashboards.types';

// Ma trận quyền: docs/architecture/permission-model.md (Xem Workspace, Tạo Dashboard — BR-03, BR-05, BR-41).
const CREATE_ROLES = ['super_admin', 'department_manager'] as const;
const PREVIEW_SIZE = 4;

type EmployeeSummary = Awaited<ReturnType<typeof getEmployeeSummary>>;

interface ViewerContext {
  role: BoardViewer['role'];
  employee: EmployeeSummary;
  invitedBoardIds: Set<string>;
}

const isManagerRecord = (member: MemberRecord) => member.id === member.managerId;

/** Trưởng phòng đứng đầu, sau đó theo tên (thứ tự từ repository). */
function groupByDepartment(members: MemberRecord[]): Map<string, MemberRecord[]> {
  const groups = new Map<string, MemberRecord[]>();
  for (const member of members) {
    if (!member.departmentId) continue;
    const group = groups.get(member.departmentId) ?? [];
    if (isManagerRecord(member)) group.unshift(member);
    else group.push(member);
    groups.set(member.departmentId, group);
  }
  return groups;
}

function managerOf(members: MemberRecord[]): PersonRef | null {
  const manager = members.find(isManagerRecord);
  return manager ? { id: manager.id, fullName: manager.fullName } : null;
}

const viewerOf = (context: ViewerContext, summary: DashboardSummary): BoardViewer => ({
  role: context.role,
  isReadOnly: summary.departmentArchived,
  isDepartmentMember: context.employee?.departmentId === summary.department.id,
  isDepartmentManager: context.employee?.managedDepartmentId === summary.department.id,
  isBoardMember: context.invitedBoardIds.has(summary.boardId),
});

function toCard(
  summary: DashboardSummary,
  members: MemberRecord[],
  shared: { avatarUrls: Map<string, string>; context: ViewerContext },
): DashboardCard {
  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    department: summary.department,
    boardId: summary.boardId,
    counts: summary.counts,
    manager: managerOf(members),
    members: {
      total: members.length,
      preview: members.slice(0, PREVIEW_SIZE).map((member) => ({
        id: member.id,
        fullName: member.fullName,
        avatarUrl: shared.avatarUrls.get(member.id) ?? null,
      })),
    },
    isReadOnly: !boardPermissions(viewerOf(shared.context, summary)).canWrite,
  };
}

export async function listDashboards({ env, actor }: RequestScope): Promise<DashboardCard[]> {
  const includeAll = actor.role === 'super_admin' || actor.role === 'hr_admin';
  const [summaries, employee] = await Promise.all([
    dashboardsRepository.listVisible(env, actor.id, includeAll),
    getEmployeeSummary(env, actor.id),
  ]);
  if (summaries.length === 0) return [];
  const departmentIds = [...new Set(summaries.map((summary) => summary.department.id))];
  const [members, invitedBoardIds] = await Promise.all([
    dashboardsRepository.listMembers(env, departmentIds),
    employee ? dashboardsRepository.listInvitedBoardIds(env, employee.employeeId) : [],
  ]);
  const byDepartment = groupByDepartment(members);
  const previews = departmentIds.flatMap((id) =>
    (byDepartment.get(id) ?? []).slice(0, PREVIEW_SIZE),
  );
  const shared = {
    avatarUrls: await getAvatarUrls(env, previews),
    context: { role: actor.role, employee, invitedBoardIds: new Set(invitedBoardIds) },
  };
  return summaries.map((summary) =>
    toCard(summary, byDepartment.get(summary.department.id) ?? [], shared),
  );
}

export async function getDashboard(
  { env, actor }: RequestScope,
  id: string,
): Promise<DashboardDetail> {
  const summary = await dashboardsRepository.findSummary(env, id);
  if (!summary) throw dashboardNotFound();
  const [access, invitedIds] = await Promise.all([
    dashboardsRepository.findWorkAccess(env, actor.id, summary.boardId),
    dashboardsRepository.listInvitedEmployeeIds(env, summary.boardId),
  ]);
  if (!access) throw dashboardNotFound();
  const viewer = boardPermissions(access);
  if (!viewer.canView) throw forbidden();
  const members = await dashboardsRepository.listMembers(env, [summary.department.id], invitedIds);
  const avatarUrls = await getAvatarUrls(env, members);
  const manager = managerOf(members.filter((m) => m.departmentId === summary.department.id));
  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    department: summary.department,
    departmentArchived: summary.departmentArchived,
    boardId: summary.boardId,
    manager,
    members: members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      jobTitle: member.jobTitle,
      avatarUrl: avatarUrls.get(member.id) ?? null,
      isManager: member.id === manager?.id,
    })),
    viewer,
  };
}

/** BR-02, BR-04, BR-05: tạo Dashboard + board + 3 cột; phòng đã có → 409 kèm dashboardId. */
export async function createDashboard(scope: RequestScope, input: CreateDashboardInput) {
  const { env, actor } = scope;
  assertRole(actor, CREATE_ROLES);
  const employee = actor.role === 'super_admin' ? null : await getEmployeeSummary(env, actor.id);
  if (!canCreateDashboard(actor.role, input.departmentId, employee?.managedDepartmentId ?? null)) {
    throw forbidden();
  }
  const result = await dashboardsRepository.createDashboard(env, actor.id, input);
  if (!result.created) throw dashboardAlreadyExists(result.dashboardId);
  return getDashboard(scope, result.dashboardId);
}

/** Cho module departments: departmentId → dashboardId (không truyền id → mọi phòng đã có Dashboard). */
export const getDashboardIdsByDepartment = (env: Env, departmentIds?: string[]) =>
  dashboardsRepository.listDashboardIdsByDepartment(env, departmentIds);
