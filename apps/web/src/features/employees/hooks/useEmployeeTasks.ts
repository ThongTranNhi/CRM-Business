import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { myTaskKeys } from '@/features/my-tasks/task-row';
import { listEmployeeTasks } from '../api/employee-tasks.api';
import type { EmployeeTaskTab } from '../types';

/** Việc của một nhân viên; key nằm dưới Việc của tôi để hoàn thành nhanh / sửa task làm mới luôn tab này. */
export function useEmployeeTasks(employeeId: string, tab: EmployeeTaskTab, page: number) {
  return useQuery({
    queryKey: myTaskKeys.employeeList(employeeId, tab, page),
    queryFn: () => listEmployeeTasks(employeeId, tab, page),
    placeholderData: keepPreviousData,
  });
}
