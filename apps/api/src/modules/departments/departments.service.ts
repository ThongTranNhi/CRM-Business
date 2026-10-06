import { departmentNotFound } from '../../lib/directory-errors';
import type { Page } from '../../lib/pagination';
import type { Env } from '../../config/env';
import { assertRole, type RequestScope } from '../../lib/request-scope';
import { getDashboardIdsByDepartment } from '../department-dashboards/department-dashboards.service';
import { getAvatarUrls } from '../users/users.service';
import * as departmentsRepository from './departments.repository';
import type {
  AddMemberInput,
  CreateDepartmentInput,
  DepartmentDetail,
  DepartmentListItem,
  DepartmentRecord,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from './departments.types';

// Ma trận quyền: docs/architecture/permission-model.md (Quản lý phòng ban, BR-08, BR-09).
const MANAGE_ROLES = ['super_admin', 'hr_admin'] as const;
const DELETE_ROLES = ['super_admin'] as const;

/** Gắn Dashboard chính của từng phòng (cột Dashboard ở trang Phòng ban, frontend-spec 4.10). */
async function withDashboards(
  env: Env,
  records: DepartmentRecord[],
): Promise<DepartmentListItem[]> {
  const dashboardIds = await getDashboardIdsByDepartment(
    env,
    records.map((record) => record.id),
  );
  return records.map((record) => ({ ...record, dashboardId: dashboardIds.get(record.id) ?? null }));
}

async function listActive(env: Env, query: ListDepartmentsQuery) {
  if (!query.withoutDashboard) return departmentsRepository.listActive(env, query);
  const withDashboard = await getDashboardIdsByDepartment(env);
  return departmentsRepository.listActive(env, query, [...withDashboard.keys()]);
}

export async function listDepartments(
  { env, actor }: RequestScope,
  query: ListDepartmentsQuery,
): Promise<Page<DepartmentListItem>> {
  if (query.status === 'deleted') assertRole(actor, DELETE_ROLES);
  const page =
    query.status === 'active'
      ? await listActive(env, query)
      : await departmentsRepository.listDeleted(env, query);
  return { ...page, data: await withDashboards(env, page.data) };
}

export async function getDepartment({ env }: RequestScope, id: string): Promise<DepartmentDetail> {
  const [department, members] = await Promise.all([
    departmentsRepository.findActive(env, id),
    departmentsRepository.listMembers(env, id),
  ]);
  if (!department) throw departmentNotFound();
  const [dashboardIds, avatarUrls] = await Promise.all([
    getDashboardIdsByDepartment(env, [id]),
    getAvatarUrls(env, members),
  ]);
  return {
    ...department,
    dashboardId: dashboardIds.get(id) ?? null,
    members: members.map((member) => ({
      id: member.id,
      fullName: member.fullName,
      jobTitle: member.jobTitle,
      avatarUrl: avatarUrls.get(member.id) ?? null,
      isManager: member.id === department.manager?.id,
    })),
  };
}

export async function createDepartment(scope: RequestScope, input: CreateDepartmentInput) {
  assertRole(scope.actor, MANAGE_ROLES);
  const id = await departmentsRepository.createDepartment(scope.env, scope.actor.id, input);
  return getDepartment(scope, id);
}

export async function updateDepartment(
  scope: RequestScope,
  id: string,
  input: UpdateDepartmentInput,
) {
  assertRole(scope.actor, MANAGE_ROLES);
  await departmentsRepository.updateDepartment(scope.env, scope.actor.id, { id, ...input });
  return getDepartment(scope, id);
}

/** [Thêm thành viên] và [Chuyển phòng]: đưa nhân viên vào phòng `departmentId`. */
export async function addMember(scope: RequestScope, departmentId: string, input: AddMemberInput) {
  assertRole(scope.actor, MANAGE_ROLES);
  await departmentsRepository.moveEmployee(scope.env, scope.actor.id, { departmentId, ...input });
  return getDepartment(scope, departmentId);
}

export async function deleteDepartment(
  { env, actor }: RequestScope,
  id: string,
  receivingDepartmentId: string | null,
) {
  assertRole(actor, DELETE_ROLES);
  const movedEmployees = await departmentsRepository.deleteDepartment(env, actor.id, {
    id,
    receivingDepartmentId,
  });
  return { movedEmployees };
}

export async function restoreDepartment(scope: RequestScope, id: string) {
  assertRole(scope.actor, DELETE_ROLES);
  await departmentsRepository.restoreDepartment(scope.env, scope.actor.id, id);
  return getDepartment(scope, id);
}
