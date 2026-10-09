import type { PersonRef } from '@/features/departments';

// Bám response của /api/department-dashboards (docs/api/endpoints/dashboards.md).

export interface DepartmentRef {
  id: string;
  name: string;
}

export interface MemberPreview extends PersonRef {
  avatarUrl: string | null;
}

export interface DashboardCounts {
  open: number;
  inProgress: number;
  overdue: number;
}

export interface DashboardCard {
  id: string;
  name: string;
  description: string | null;
  department: DepartmentRef;
  boardId: string;
  counts: DashboardCounts;
  manager: PersonRef | null;
  members: { total: number; preview: MemberPreview[] };
  /** Người xem không ghi được (vd. HR Admin không phải thành viên board) → "Chỉ xem". */
  isReadOnly: boolean;
}

export interface BoardMember extends MemberPreview {
  jobTitle: string | null;
  isManager: boolean;
}

export interface BoardViewer {
  canView: boolean;
  canWrite: boolean;
  canEditAllTasks: boolean;
  /** Thùng rác: `all` mọi việc đã xoá, `own` việc mình tạo; null → ẩn nút. */
  trashScope: 'all' | 'own' | null;
}

export interface DashboardDetail {
  id: string;
  name: string;
  description: string | null;
  department: DepartmentRef;
  departmentArchived: boolean;
  boardId: string;
  manager: PersonRef | null;
  members: BoardMember[];
  /** Dự án chưa lưu trữ của phòng: ô "Dự án" của task, lọc ?project= (BR-30). */
  projects: { id: string; name: string }[];
  viewer: BoardViewer;
}

export interface CreateDashboardInput {
  departmentId: string;
  name?: string;
  description?: string;
}

/** State khi bấm thẻ ở Workspace: board tải song song với header (không chờ nối tiếp). */
export interface DashboardLinkState {
  boardId: string;
}
