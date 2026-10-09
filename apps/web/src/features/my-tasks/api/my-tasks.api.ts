import { apiPageWithMeta, withQuery } from '@/lib/api-client';
import type { MyTask, MyTaskParams, MyTasksMeta } from '../types';

export const MY_TASK_PAGE_SIZE = 20;

export const listMyTasks = ({ tab, departmentId, priority, projectId, q, page }: MyTaskParams) =>
  apiPageWithMeta<MyTask, MyTasksMeta>(
    withQuery('/api/tasks/mine', {
      tab,
      departmentId,
      priority,
      projectId,
      q,
      page,
      pageSize: MY_TASK_PAGE_SIZE,
    }),
  );
