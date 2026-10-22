// GET /api/overview/me — Tổng quan cá nhân (docs/api/endpoints/overview.md).
import type { ProjectSummary } from '../projects/projects.types';
import type { MyTask, MyTaskCardCounts } from '../tasks/tasks.types';
import type { WorkloadRow } from '../workload/workload.types';

export interface PersonalOverview {
  /** 4 thẻ: việc mình phụ trách + phối hợp (cùng cách đếm với Việc của tôi). */
  counts: MyTaskCardCounts;
  /** Chưa xong, hạn từ hôm nay tới 6 ngày sau; tối đa 8, hạn gần nhất trước. */
  dueSoon: MyTask[];
  /** Chỉ Super Admin: việc đang mở / quá hạn toàn công ty; role khác null. */
  company: { open: number; overdue: number } | null;
}

// GET /api/overview/executive — Tổng quan điều hành.
export const OVERVIEW_PERIODS = ['week', 'month', 'quarter'] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

export interface TaskStatusCounts {
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

/** Việc TẠO trong kỳ của một phòng (chỉ phòng có việc). */
export interface DepartmentTaskStats extends TaskStatusCounts {
  department: { id: string; name: string };
  /** Bấm phòng → Dashboard phòng; null nếu phòng chưa có Dashboard. */
  dashboardId: string | null;
}

export interface UpcomingTask {
  id: string;
  title: string;
  status: 'todo' | 'in_progress';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  dueDate: string;
  /** 0 = hôm nay (giờ Việt Nam). */
  daysLeft: number;
  department: { id: string; name: string };
  dashboardId: string;
  assignee: { id: string; fullName: string };
}

export interface ExecutiveOverview {
  period: OverviewPeriod;
  /** Phạm vi: null = mọi phòng (Super Admin); Trưởng phòng = phòng mình. */
  departmentId: string | null;
  /** Việc tạo trong kỳ; `total` = todo + inProgress + done. */
  totals: TaskStatusCounts & { total: number };
  departments: DepartmentTaskStats[];
  /** Dự án chưa xong, hạn gần nhất trước (tối đa 8) — không theo kỳ. */
  projects: ProjectSummary[];
  /** Việc chưa xong hạn từ hôm nay tới 6 ngày sau (tối đa 8) — không theo kỳ. */
  upcoming: UpcomingTask[];
  /** Có việc quá hạn hoặc quá 10 việc đang mở (tối đa 5) — không theo kỳ. */
  overloaded: WorkloadRow[];
}
