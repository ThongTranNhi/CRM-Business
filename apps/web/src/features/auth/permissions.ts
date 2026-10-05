import type { Role } from './roles';
import type { CurrentUser } from './types';

/**
 * Quyền hiển thị theo docs/architecture/permission-model.md. Chỉ để ẩn nút / mục menu;
 * backend luôn kiểm tra lại (BR-40). Không viết `role === ...` rải rác trong component.
 */
const PERMISSIONS = {
  'workload.view': ['super_admin', 'department_manager', 'team_leader'],
  'executive-overview.view': ['super_admin', 'department_manager'],
  // Mở rộng cho HR / Trưởng phòng khi API Nhân viên mở rộng (hiện API chỉ cho Super Admin).
  'employees.view': ['super_admin'],
  'employees.manage': ['super_admin'],
  'departments.manage': ['super_admin', 'hr_admin'],
  'departments.delete': ['super_admin'],
  'dashboards.create': ['super_admin', 'department_manager'],
  'recruitment.view': ['super_admin', 'hr_admin', 'department_manager'],
  'onboarding.view': ['super_admin', 'hr_admin', 'department_manager'],
  'payroll.manage': ['super_admin', 'hr_admin'],
  'reports.view': ['super_admin', 'hr_admin', 'department_manager'],
  'settings.view': ['super_admin', 'hr_admin'],
} as const satisfies Record<string, readonly Role[]>;

export type Permission = keyof typeof PERMISSIONS;

interface PermissionScope {
  departmentId?: string;
}

export function can(
  user: CurrentUser | undefined,
  permission: Permission,
  scope: PermissionScope = {},
): boolean {
  if (!user) return false;
  const roles: readonly Role[] = PERMISSIONS[permission];
  if (!roles.includes(user.role)) return false;
  // BR-05: Trưởng phòng chỉ tạo Dashboard cho phòng mình.
  if (permission === 'dashboards.create' && user.role === 'department_manager') {
    return scope.departmentId !== undefined && scope.departmentId === user.departmentId;
  }
  return true;
}
