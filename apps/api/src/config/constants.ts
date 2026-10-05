export const ROLES = [
  'super_admin',
  'hr_admin',
  'department_manager',
  'team_leader',
  'employee',
] as const;

export type Role = (typeof ROLES)[number];

/** Role khi JWT không có app_metadata.role hợp lệ. */
export const DEFAULT_ROLE: Role = 'employee';

export const REQUEST_ID_HEADER = 'X-Request-Id';
