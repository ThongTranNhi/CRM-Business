// GET /api/overview/me — Tổng quan cá nhân (docs/api/endpoints/overview.md).
import type { MyTask, MyTaskCardCounts } from '../tasks/tasks.types';

export interface PersonalOverview {
  /** 4 thẻ: việc mình phụ trách + phối hợp (cùng cách đếm với Việc của tôi). */
  counts: MyTaskCardCounts;
  /** Chưa xong, hạn từ hôm nay tới 6 ngày sau; tối đa 8, hạn gần nhất trước. */
  dueSoon: MyTask[];
  /** Chỉ Super Admin: việc đang mở / quá hạn toàn công ty; role khác null. */
  company: { open: number; overdue: number } | null;
}
