import { useQuery } from '@tanstack/react-query';
import { ApiError } from '@/lib/api-client';
import { getTask } from '../api/task-detail.api';
import { taskKeys } from './task-keys';

/** Chi tiết task cho drawer; 4xx (không tồn tại, đã xoá, không có quyền) không thử lại. */
export function useTask(taskId: string) {
  return useQuery({
    queryKey: taskKeys.detail(taskId),
    queryFn: () => getTask(taskId),
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status < 500) && failureCount < 1,
  });
}
