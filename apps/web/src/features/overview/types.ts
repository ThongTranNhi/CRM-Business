// GET /api/overview/me, /api/overview/executive (docs/api/endpoints/overview.md).
import type { MyTask } from '@/features/my-tasks/task-row';

/** 4 thẻ: việc mình phụ trách + phối hợp (cùng cách đếm với Việc của tôi). */
export interface OverviewCounts {
  todo: number;
  inProgress: number;
  overdue: number;
  doneThisWeek: number;
}

export interface PersonalOverview {
  counts: OverviewCounts;
  /** Chưa xong, hạn từ hôm nay tới 6 ngày sau; tối đa 8, hạn gần nhất trước. */
  dueSoon: MyTask[];
  /** Chỉ Super Admin; role khác null (server quyết định). */
  company: { open: number; overdue: number } | null;
}

// GET /api/overview/executive?period= — Tổng quan điều hành.
export const OVERVIEW_PERIODS = ['week', 'month', 'quarter'] as const;
export type OverviewPeriod = (typeof OVERVIEW_PERIODS)[number];

export interface TaskStatusCounts {
  todo: number;
  inProgress: number;
  done: number;
  overdue: number;
}

/** Việc TẠO trong kỳ của một phòng (server chỉ trả phòng có việc). */
export interface DepartmentTaskStats extends TaskStatusCounts {
  department: { id: string; name: string };
  dashboardId: string | null;
}

export interface ProjectProgressItem {
  id: string;
  name: string;
  dueDate: string | null;
  department: { id: string; name: string };
  progress: { total: number; done: number; overdue: number; percent: number | null };
}

export interface UpcomingTask {
  id: string;
  title: string;
  dueDate: string;
  /** 0 = hôm nay (giờ Việt Nam). */
  daysLeft: number;
  department: { id: string; name: string };
  dashboardId: string;
  assignee: { id: string; fullName: string };
}

export interface OverloadedEmployee {
  employee: { id: string; fullName: string };
  department: { id: string; name: string } | null;
  open: number;
  overdue: number;
}

export interface ExecutiveOverview {
  period: OverviewPeriod;
  /** null = mọi phòng (Super Admin); Trưởng phòng = phòng mình. */
  departmentId: string | null;
  totals: TaskStatusCounts & { total: number };
  departments: DepartmentTaskStats[];
  /** Không theo kỳ: dự án chưa xong (8), hạn chót 7 ngày tới (8), nhân viên quá tải (5). */
  projects: ProjectProgressItem[];
  upcoming: UpcomingTask[];
  overloaded: OverloadedEmployee[];
}
