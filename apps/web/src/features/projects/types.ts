import type { PersonRef } from '@/features/departments';

// Bám response của /api/projects (docs/api/endpoints/projects.md).
export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'done';
/** Bộ lọc trạng thái trên URL: thêm `archived` (dự án đã lưu trữ, để khôi phục). */
export type ProjectStatusFilter = ProjectStatus | 'archived';

/** BR-31: tiến độ tính từ task thật; percent null khi dự án chưa có task. */
export interface ProjectProgress {
  total: number;
  done: number;
  overdue: number;
  percent: number | null;
}

export interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  archivedAt: string | null;
  createdAt: string;
  department: { id: string; name: string };
  departmentArchived: boolean;
  /** Dashboard của phòng (mở task trên board); null nếu phòng chưa có Dashboard. */
  dashboardId: string | null;
  owner: PersonRef | null;
  progress: ProjectProgress;
  memberCount: number;
}

export interface ProjectMember extends PersonRef {
  jobTitle: string | null;
  avatarUrl: string | null;
  isArchived: boolean;
}

export interface ProjectDetail extends ProjectSummary {
  members: ProjectMember[];
  permissions: { canEdit: boolean; canManageMembers: boolean; canArchive: boolean };
}

export interface ProjectTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string | null;
  completedAt: string | null;
  assignee: PersonRef & { isArchived: boolean };
}

export interface ProjectActivityValue {
  name?: string;
  description?: string | null;
  owner?: PersonRef | null;
  status?: ProjectStatus;
  startDate?: string | null;
  dueDate?: string | null;
  members?: PersonRef[];
  task?: { id: string; title: string };
}

export interface ProjectActivity {
  id: string;
  action: string;
  createdAt: string;
  actor: PersonRef | null;
  from: ProjectActivityValue | null;
  to: ProjectActivityValue | null;
}

/** Người chọn được làm chủ / thành viên dự án (Q6). */
export interface EligibleMember extends PersonRef {
  jobTitle: string | null;
  avatarUrl: string | null;
}

export interface ProjectListParams {
  status: ProjectStatusFilter | null;
  q: string;
  page: number;
}

export interface ProjectInput {
  name: string;
  description: string | null;
  ownerEmployeeId: string | null;
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
}

export interface CreateProjectInput extends ProjectInput {
  departmentId: string;
  memberIds: string[];
}
