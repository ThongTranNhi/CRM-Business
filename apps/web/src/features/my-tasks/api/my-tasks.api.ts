import { apiPageWithMeta, withQuery } from '@/lib/api-client';
import type { MyTask, MyTaskParams, MyTasksMeta } from '../types';

export const MY_TASK_PAGE_SIZE = 20;

/** Tab + bộ lọc (`status`, `departmentId`, `priority`, `projectId`, `q`); giá trị rỗng bị bỏ khỏi URL. */
export const listMyTasks = ({ page, ...filters }: MyTaskParams) =>
  apiPageWithMeta<MyTask, MyTasksMeta>(
    withQuery('/api/tasks/mine', { ...filters, page, pageSize: MY_TASK_PAGE_SIZE }),
  );

/** Chỉ số đếm các tab (không lọc) — badge Sidebar: lấy 1 dòng, đọc meta.counts. */
export const getMyTaskCounts = async () =>
  (await apiPageWithMeta<MyTask, MyTasksMeta>(withQuery('/api/tasks/mine', { pageSize: 1 }))).meta
    .counts;
