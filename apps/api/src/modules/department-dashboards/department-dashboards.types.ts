import type { z } from 'zod';
import type { BoardPermissions } from '../../lib/work-access';
import type { AvatarOwner } from '../users/users.types';
import type { createDashboardSchema } from './department-dashboards.schema';

export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;

export interface PersonRef {
  id: string;
  fullName: string;
}

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface MemberPreview extends PersonRef {
  avatarUrl: string | null;
}

export interface BoardMember extends MemberPreview {
  jobTitle: string | null;
  isManager: boolean;
}

/** Một dòng view dashboard_summaries sau khi map. */
export interface DashboardSummary {
  id: string;
  name: string;
  description: string | null;
  department: DepartmentRef;
  departmentArchived: boolean;
  boardId: string;
  counts: { open: number; inProgress: number; overdue: number };
}

/** Thẻ Dashboard ở Workspace. isReadOnly: người xem không ghi được (vd. HR Admin không là thành viên). */
export interface DashboardCard extends Omit<DashboardSummary, 'departmentArchived'> {
  manager: PersonRef | null;
  members: { total: number; preview: MemberPreview[] };
  isReadOnly: boolean;
}

export interface DashboardDetail extends Omit<DashboardSummary, 'counts'> {
  manager: PersonRef | null;
  members: BoardMember[];
  viewer: BoardPermissions;
}

/** Nhân viên đang làm, kèm phòng và trưởng phòng của phòng đó. */
export interface MemberRecord extends AvatarOwner {
  fullName: string;
  jobTitle: string | null;
  departmentId: string | null;
  managerId: string | null;
  managerName: string | null;
}
