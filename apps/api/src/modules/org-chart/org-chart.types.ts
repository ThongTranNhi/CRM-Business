// GET /api/org-chart — Sơ đồ tổ chức (frontend-spec 4.11, docs/api/endpoints/org-chart.md).
import type { Role } from '../../config/constants';

export interface OrgPerson {
  id: string;
  fullName: string;
  jobTitle: string | null;
  /** Hiện nhãn CEO / Trưởng nhóm trên thẻ người. */
  role: Role;
  avatarUrl: string | null;
}

export interface OrgDepartment {
  id: string;
  name: string;
  /** Trưởng phòng; null nếu phòng chưa có. */
  manager: OrgPerson | null;
  /** Thành viên trừ Trưởng phòng và Ban lãnh đạo; Trưởng nhóm đứng trước, rồi theo tên. */
  members: OrgPerson[];
}

export interface OrgChart {
  /** Ban lãnh đạo: tài khoản Super Admin (CEO / Master) — gốc của cây. */
  leaders: OrgPerson[];
  /** Phòng ban chưa xoá, theo tên (cả phòng chưa có ai). */
  departments: OrgDepartment[];
  /** Nhân viên chưa thuộc phòng nào (không gồm Ban lãnh đạo). */
  unassigned: OrgPerson[];
}

/** Một nhân viên đang làm, đọc từ view active_employees. */
export interface OrgEmployeeRecord {
  id: string;
  fullName: string;
  jobTitle: string | null;
  role: Role;
  departmentId: string | null;
  /** Người này đang là Trưởng phòng của `departmentId`. */
  isDepartmentManager: boolean;
  authUserId: string | null;
  avatarPath: string | null;
}
