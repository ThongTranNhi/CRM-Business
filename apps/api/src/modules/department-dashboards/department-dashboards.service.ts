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
  DepartmentPreview,
  MemberRecord,
  PersonRef,
} from './department-dashboards.types';

// Ma trận quyền: docs/architecture/permission-model.md (Xem Workspace, Tạo Dashboard — BR-03, BR-05, BR-41).
const CREATE_ROLES = ['super_admin', 'department_manager'] as const;

type EmployeeSummary = Awaited<ReturnType<typeof getEmployeeSummary>>;

interface ViewerContext {
  role: BoardViewer['role'];
  employee: EmployeeSummary;
  invitedBoardIds: Set<string>;
}

const isManagerRecord = (member: MemberRecord) => member.id === member.managerId;

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
  preview: DepartmentPreview | undefined,
  shared: { avatarUrls: Map<string, string>; context: ViewerContext },
): DashboardCard {
  return {
    id: summary.id,
    name: summary.name,
    description: summary.description,
    department: summary.department,
    boardId: summary.boardId,
    counts: summary.counts,
    manager: preview?.manager ?? null,
    members: {
      total: preview?.memberCount ?? 0,
      preview: (preview?.members ?? []).map((member) => ({
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
  const [previews, invitedBoardIds] = await Promise.all([
    dashboardsRepository.listDepartmentPreviews(env, departmentIds),
    employee ? dashboardsRepository.listInvitedBoardIds(env, employee.employeeId) : [],
  ]);
  const previewMembers = [...previews.values()].flatMap((preview) => preview.members);
  const shared = {
    avatarUrls: await getAvatarUrls(env, previewMembers),
    context: { role: actor.role, employee, invitedBoardIds: new Set(invitedBoardIds) },
  };
  return summaries.map((summary) => toCard(summary, previews.get(summary.department.id), shared));
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
  const members = await dashboardsRepository.listBoardMembers(
    env,
    summary.department.id,
    invitedIds,
  );
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
