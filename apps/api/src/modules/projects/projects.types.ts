import type { z } from 'zod';
import type { PersonRef } from '../departments/departments.types';
import type {
  createProjectSchema,
  listProjectsQuerySchema,
  PROJECT_STATUSES,
  updateProjectSchema,
} from './projects.schema';

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];
export type ListProjectsQuery = z.infer<typeof listProjectsQuerySchema>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

/** BR-31: tiến độ tính từ task thật. percent null khi dự án chưa có task. */
export interface ProjectProgress {
  total: number;
  done: number;
  overdue: number;
  percent: number | null;
}

/** Một dòng view project_summaries sau khi map (danh sách và phần đầu trang chi tiết). */
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
  /** Phòng ban đã xoá → dự án chỉ xem được. */
  departmentArchived: boolean;
  /** Dashboard của phòng (bấm task → board `?task=`); null nếu phòng chưa có Dashboard. */
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

/** Một task của dự án (tab Công việc). */
export interface ProjectTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string | null;
  completedAt: string | null;
  assignee: PersonRef & { isArchived: boolean };
}

/** Giá trị trước / sau của một dòng lịch sử dự án, id người đã đổi thành tên. */
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
  /** project.create | project.update | project.members | project.archive | project.restore |
   * project.task_added | project.task_removed */
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
