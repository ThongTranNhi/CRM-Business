import type { Role } from './roles';

/** Response của GET /api/auth/me (docs/api/endpoints/auth.md). */
export interface CurrentUser {
  id: string;
  role: Role;
  status: string;
  username: string | null;
  mustChangePassword: boolean;
  resetVersion: number;
  /** CEO / Master cho Super Admin; null với role khác. */
  adminTitle: string | null;
  employeeId: string | null;
  fullName: string | null;
  departmentId: string | null;
  departmentName: string | null;
}
