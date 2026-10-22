import type { MyTask, MyTasksMeta } from '@/features/my-tasks/task-row';
import { apiPageWithMeta, withQuery } from '@/lib/api-client';
import type { EmployeeTaskTab } from '../types';

export const EMPLOYEE_TASK_PAGE_SIZE = 20;

/** GET /api/users/employees/:id/tasks — tab Công việc ở hồ sơ (Super Admin), cùng dạng Việc của tôi. */
export const listEmployeeTasks = (employeeId: string, tab: EmployeeTaskTab, page: number) =>
  apiPageWithMeta<MyTask, MyTasksMeta>(
    withQuery(`/api/users/employees/${employeeId}/tasks`, {
      tab,
      page,
      pageSize: EMPLOYEE_TASK_PAGE_SIZE,
    }),
  );
