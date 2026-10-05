// 5 role hệ thống, đọc từ /api/auth/me (docs/product/user-roles.md).
export type Role = 'super_admin' | 'hr_admin' | 'department_manager' | 'team_leader' | 'employee';

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'CEO / Super Admin',
  hr_admin: 'HR Admin',
  department_manager: 'Trưởng phòng',
  team_leader: 'Trưởng nhóm',
  employee: 'Nhân viên',
};
