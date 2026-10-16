// GET /api/overview/me (docs/api/endpoints/overview.md).
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
