// GET /api/org-chart (docs/api/endpoints/org-chart.md).
import type { Role } from '@/features/auth';

export interface OrgPerson {
  id: string;
  fullName: string;
  jobTitle: string | null;
  role: Role;
  avatarUrl: string | null;
}

export interface OrgDepartment {
  id: string;
  name: string;
  manager: OrgPerson | null;
  /** Trừ Trưởng phòng; Trưởng nhóm đứng trước. */
  members: OrgPerson[];
}

export interface OrgChart {
  /** Ban lãnh đạo (CEO / Super Admin) — gốc của cây. */
  leaders: OrgPerson[];
  departments: OrgDepartment[];
  /** Chưa thuộc phòng nào. */
  unassigned: OrgPerson[];
}
