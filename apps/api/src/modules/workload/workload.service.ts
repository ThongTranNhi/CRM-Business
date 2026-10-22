import type { Env } from '../../config/env';
import type { Role } from '../../config/constants';
import { forbidden } from '../../lib/app-error';
import { toPage } from '../../lib/pagination';
import { assertRole, type RequestScope } from '../../lib/request-scope';
import { getEmployeeSummary } from '../auth/auth.service';
import * as workloadRepository from './workload.repository';
import type { WorkloadQuery } from './workload.schema';
import type { WorkloadRow } from './workload.types';

// Khối lượng việc (Đợt 4 S1, permission-model: Workload): Super Admin xem mọi phòng; Trưởng phòng và Trưởng nhóm
// chỉ xem nhân viên phòng mình (phòng lấy từ phiên đăng nhập, không tin query). HR và Nhân viên không có quyền.

export const WORKLOAD_ROLES: readonly Role[] = ['super_admin', 'department_manager', 'team_leader'];

/**
 * Phòng được xem: Super Admin → phòng đang lọc (null = mọi phòng); role khác → phòng của chính họ, lọc phòng khác
 * là 403. Trả `undefined` khi người gọi chưa thuộc phòng nào (không có ai để xem).
 */
async function resolveDepartment(scope: RequestScope, requested: string | undefined) {
  if (scope.actor.role === 'super_admin') return requested ?? null;
  const employee = await getEmployeeSummary(scope.env, scope.actor.id);
  const own = employee?.departmentId ?? undefined;
  if (requested && requested !== own) throw forbidden();
  return own;
}

/** Một trang bảng khối lượng việc — `{ data, meta: { page, pageSize, total } }`. */
export async function listWorkload(scope: RequestScope, query: WorkloadQuery) {
  assertRole(scope.actor, WORKLOAD_ROLES);
  const pagination = { page: query.page, pageSize: query.pageSize };
  const departmentId = await resolveDepartment(scope, query.departmentId);
  if (departmentId === undefined) return toPage<WorkloadRow>([], 0, pagination);
  const { rows, total } = await workloadRepository.listWorkload(scope.env, query, departmentId);
  return toPage(rows, total, pagination);
}

/** Quá tải: hơn 10 việc đang mở (cùng ngưỡng tô màu warning ở bảng Khối lượng việc — frontend-spec 4.6). */
export const OVERLOAD_OPEN_TASKS = 10;

/** Cho module overview (Tổng quan điều hành): nhân viên quá tải / có việc quá hạn; phạm vi phòng do nơi gọi chốt. */
export const listOverloadedEmployees = (env: Env, departmentId: string | null, limit: number) =>
  workloadRepository.listOverloaded(env, departmentId, OVERLOAD_OPEN_TASKS, limit);
