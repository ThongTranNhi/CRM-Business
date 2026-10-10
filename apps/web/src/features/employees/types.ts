import type { Role } from '@/features/auth';
export interface OwnProfile {
  id: string;
  fullName: string;
  employeeCode: string | null;
  jobTitle: string | null;
  departmentName: string | null;
  managerName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
}

export interface ProfileUpdate {
  employeeCode: string | null;
  avatarPath?: string | null;
}

export interface DirectoryEmployee extends OwnProfile {
  departmentId: string | null;
  username: string | null;
  role: string | null;
  status: string | null;
  archivedAt: string | null;
  /** Phòng mà người này đang làm trưởng phòng. */
  managedDepartment: { id: string; name: string } | null;
}

/**
 * GET /api/users/employees/:id: kèm số việc đang mở người này phụ trách và số dự án đang làm chủ (bàn giao
 * khi xoá — BR-53).
 */
export interface EmployeeDetail extends DirectoryEmployee {
  openTaskCount: number;
  ownedProjectCount: number;
}

/** Kết quả xoá: số việc đang mở / dự án đang làm chủ lúc xoá và số đã bàn giao. */
export interface DeleteEmployeeResult {
  deleted: true;
  openTaskCount: number;
  handedOverTaskCount: number;
  ownedProjectCount: number;
  handedOverProjectCount: number;
}

export interface DeleteEmployeeInput {
  newManagerId: string | null;
  handoverEmployeeId: string | null;
}

export const EMPLOYEE_STATUSES = ['active', 'locked', 'deleted'] as const;
export type EmployeeStatusFilter = (typeof EMPLOYEE_STATUSES)[number];

export interface DirectoryParams {
  status: EmployeeStatusFilter;
  q: string;
  page: number;
}

export interface AdminEmployeeUpdate {
  fullName: string;
  jobTitle: string | null;
  departmentId: string | null;
  status: 'active' | 'disabled';
}

/** Một dòng trong ô chọn người (chỉ người chưa bị xoá). */
export interface EmployeeOption {
  id: string;
  fullName: string;
  jobTitle: string | null;
  departmentId: string | null;
  departmentName: string | null;
  role: Role | null;
}
