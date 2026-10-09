import type { Env } from '../../config/env';
import { forbidden } from '../../lib/app-error';
import {
  canCreateProject,
  canSeeAllProjects,
  projectPermissions,
  type ProjectViewer,
} from '../../lib/project-access';
import { projectNotFound, projectReadOnly } from '../../lib/project-errors';
import type { RequestScope } from '../../lib/request-scope';
import { getEmployeeSummary } from '../auth/auth.service';
import { getAvatarUrls } from '../users/users.service';
import type { PersonRow } from './projects.people.repository';
import * as peopleRepository from './projects.people.repository';
import * as projectsRepository from './projects.repository';
import type {
  CreateProjectInput,
  EligibleMember,
  ListProjectsQuery,
  ProjectDetail,
  ProjectSummary,
  UpdateProjectInput,
} from './projects.types';

// Quyền: lib/project-access.ts (docs/architecture/permission-model.md — Dự án). RPC kiểm tra lại toàn vẹn
// dữ liệu: phòng còn hoạt động, chủ / thành viên đủ điều kiện (Q6), tên không trùng.

async function viewerOf({ env, actor }: RequestScope): Promise<ProjectViewer> {
  const employee = await getEmployeeSummary(env, actor.id);
  return {
    role: actor.role,
    employeeId: employee?.employeeId ?? null,
    departmentId: employee?.departmentId ?? null,
    managedDepartmentId: employee?.managedDepartmentId ?? null,
  };
}

/** Người xem ở phòng khác: còn được mời vào board của phòng dự án không. */
async function isOnProjectBoard(env: Env, viewer: ProjectViewer, project: ProjectSummary) {
  if (!viewer.employeeId || !project.boardId) return false;
  if (viewer.departmentId === project.department.id) return false;
  const boardIds = await peopleRepository.listBoardIdsOf(env, viewer.employeeId);
  return boardIds.includes(project.boardId);
}

/** Dự án + quyền của người xem; không xem được → 403, không tồn tại → 404. */
export async function loadProject(scope: RequestScope, projectId: string) {
  const [project, viewer, memberIds] = await Promise.all([
    projectsRepository.findSummary(scope.env, projectId),
    viewerOf(scope),
    projectsRepository.listMemberIds(scope.env, projectId),
  ]);
  if (!project) throw projectNotFound();
  const permissions = projectPermissions(viewer, {
    departmentId: project.department.id,
    ownerEmployeeId: project.owner?.id ?? null,
    isMember: viewer.employeeId !== null && memberIds.includes(viewer.employeeId),
    isBoardMember: await isOnProjectBoard(scope.env, viewer, project),
    isReadOnly: project.departmentArchived,
  });
  if (!permissions.canView) throw forbidden();
  return { project, permissions, memberIds };
}

/** Ghi: phòng đã xoá → 409 trước; không đủ quyền → 403; dự án đã lưu trữ (trừ khôi phục) → 404. */
function requireWrite(project: ProjectSummary, isAllowed: boolean, { archived = false } = {}) {
  if (project.departmentArchived) throw projectReadOnly();
  if (!isAllowed) throw forbidden();
  if ((project.archivedAt !== null) !== archived) throw projectNotFound();
}

async function withAvatars(env: Env, people: PersonRow[]) {
  const avatarUrls = await getAvatarUrls(env, people);
  return people.map((person) => ({
    id: person.id,
    fullName: person.fullName,
    jobTitle: person.jobTitle,
    avatarUrl: avatarUrls.get(person.id) ?? null,
    isArchived: person.isArchived,
  }));
}

/** Super Admin, HR Admin: mọi dự án; người khác: dự án phòng mình + dự án mình là thành viên. */
export async function listProjects(scope: RequestScope, query: ListProjectsQuery) {
  if (canSeeAllProjects(scope.actor.role)) {
    return projectsRepository.listSummaries(scope.env, query, null);
  }
  const viewer = await viewerOf(scope);
  const [projectIds, boardIds] = viewer.employeeId
    ? await Promise.all([
        projectsRepository.listProjectIdsOf(scope.env, viewer.employeeId),
        peopleRepository.listBoardIdsOf(scope.env, viewer.employeeId),
      ])
    : [[], []];
  return projectsRepository.listSummaries(scope.env, query, {
    departmentId: viewer.departmentId,
    projectIds,
    boardIds,
  });
}

export async function getProject(scope: RequestScope, projectId: string): Promise<ProjectDetail> {
  const { project, permissions, memberIds } = await loadProject(scope, projectId);
  const people = await peopleRepository.listPeople(scope.env, memberIds);
  const { canEdit, canManageMembers, canChangeOwner, canArchive } = permissions;
  return {
    ...project,
    members: await withAvatars(scope.env, people),
    permissions: { canEdit, canManageMembers, canChangeOwner, canArchive },
  };
}

/** Super Admin mọi phòng; Trưởng phòng chỉ phòng mình. Chủ dự án tự được thêm vào thành viên. */
export async function createProject(scope: RequestScope, input: CreateProjectInput) {
  if (!canCreateProject(await viewerOf(scope), input.departmentId)) throw forbidden();
  const projectId = await projectsRepository.createProject(scope.env, scope.actor.id, input);
  return getProject(scope, projectId);
}

export async function updateProject(
  scope: RequestScope,
  projectId: string,
  input: UpdateProjectInput,
) {
  const { project, permissions } = await loadProject(scope, projectId);
  requireWrite(project, permissions.canEdit);
  // Đổi chủ: chỉ Super Admin, Trưởng phòng. Form sửa gửi lại đúng chủ hiện tại thì không tính là đổi.
  const changesOwner =
    input.ownerEmployeeId !== undefined && input.ownerEmployeeId !== (project.owner?.id ?? null);
  if (changesOwner && !permissions.canChangeOwner) throw forbidden();
  await projectsRepository.updateProject(scope.env, scope.actor.id, projectId, input);
  return getProject(scope, projectId);
}

export async function setProjectMembers(
  scope: RequestScope,
  projectId: string,
  employeeIds: string[],
) {
  const { project, permissions } = await loadProject(scope, projectId);
  requireWrite(project, permissions.canManageMembers);
  await projectsRepository.setMembers(scope.env, scope.actor.id, projectId, employeeIds);
  return getProject(scope, projectId);
}

/** Lưu trữ (không xoá): Super Admin, Trưởng phòng của phòng. */
export async function archiveProject(scope: RequestScope, projectId: string) {
  const { project, permissions } = await loadProject(scope, projectId);
  requireWrite(project, permissions.canArchive);
  await projectsRepository.archiveProject(scope.env, scope.actor.id, projectId);
}

export async function restoreProject(scope: RequestScope, projectId: string) {
  const { project, permissions } = await loadProject(scope, projectId);
  requireWrite(project, permissions.canArchive, { archived: true });
  await projectsRepository.restoreProject(scope.env, scope.actor.id, projectId);
  return getProject(scope, projectId);
}

/** Người chọn được khi TẠO dự án ở một phòng (Q6) — chỉ ai tạo được dự án ở phòng đó. */
export async function listEligibleForDepartment(
  scope: RequestScope,
  departmentId: string,
): Promise<EligibleMember[]> {
  if (!canCreateProject(await viewerOf(scope), departmentId)) throw forbidden();
  const people = await peopleRepository.listEligible(scope.env, departmentId);
  return withAvatars(scope.env, people);
}

/** Người chọn được làm chủ / thành viên của một dự án — ai quản lý thành viên dự án đó. */
export async function listEligibleForProject(scope: RequestScope, projectId: string) {
  const { project, permissions } = await loadProject(scope, projectId);
  requireWrite(project, permissions.canManageMembers);
  const people = await peopleRepository.listEligible(scope.env, project.department.id);
  return withAvatars(scope.env, people);
}

/** Cho module department-dashboards: ô "Dự án" của task (dự án chưa lưu trữ cùng phòng, BR-30). */
export const listProjectOptions = (env: Env, departmentId: string) =>
  projectsRepository.listProjectOptions(env, departmentId);
