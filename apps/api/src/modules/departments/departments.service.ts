import { departmentNotFound } from '../../lib/directory-errors';
import type { Page } from '../../lib/pagination';
import { assertRole, type RequestScope } from '../../lib/request-scope';
import { getAvatarUrls } from '../users/users.service';
import * as departmentsRepository from './departments.repository';
import type {
  AddMemberInput,
  CreateDepartmentInput,
  DepartmentDetail,
  DepartmentListItem,
  ListDepartmentsQuery,
  UpdateDepartmentInput,
} from './departments.types';

// Ma trận quyền: docs/architecture/permission-model.md (Quản lý phòng ban, BR-08, BR-09).
const MANAGE_ROLES = ['super_admin', 'hr_admin'] as const;
const DELETE_ROLES = ['super_admin'] as const;

export async function listDepartments(
  { env, actor }: RequestScope,
  query: ListDepartmentsQuery,
): Promise<Page<DepartmentListItem>> {
  if (query.status === 'active') return departmentsRepository.listActive(env, query);
  assertRole(actor, DELETE_ROLES);
  return departmentsRepository.listDeleted(env, query);
}

export async function getDepartment({ env }: RequestScope, id: string): Promise<DepartmentDetail> {
  const [department, members] = await Promise.all([
    departmentsRepository.findActive(env, id),
    departmentsRepository.listMembers(env, id),
  ]);
  if (!department) throw departmentNotFound();
  const avatarUrls = await getAvatarUrls(env, members);
  return {
    ...department,
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
