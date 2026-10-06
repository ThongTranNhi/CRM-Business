// Bám response của /api/departments (docs/api/endpoints/departments.md).
export interface PersonRef {
  id: string;
  fullName: string;
}

export interface Department {
  id: string;
  name: string;
  manager: PersonRef | null;
  memberCount: number;
  archivedAt: string | null;
  /** Dashboard chính của phòng (BR-04); null = chưa có. */
  dashboardId: string | null;
}

export interface DepartmentMember {
  id: string;
  fullName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  isManager: boolean;
}

export interface DepartmentDetail extends Department {
  members: DepartmentMember[];
}

export const DEPARTMENT_STATUSES = ['active', 'deleted'] as const;
export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number];

export interface DepartmentListParams {
  status: DepartmentStatus;
  q: string;
  page: number;
}

/** managerId bỏ qua khi sửa = giữ nguyên trưởng phòng. */
export interface DepartmentChanges {
  name?: string;
  managerId?: string | null;
}

export interface MoveMemberInput {
  employeeId: string;
  replacementManagerId: string | null;
}
