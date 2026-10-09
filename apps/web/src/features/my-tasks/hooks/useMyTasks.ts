import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listMyTasks } from '../api/my-tasks.api';
import type { MyTaskParams } from '../types';

export const myTaskKeys = {
  all: ['my-tasks'] as const,
  list: (params: MyTaskParams) => [...myTaskKeys.all, 'list', params] as const,
  overdue: () => [...myTaskKeys.all, 'overdue'] as const,
};

export function useMyTasks(params: MyTaskParams) {
  return useQuery({
    queryKey: myTaskKeys.list(params),
    queryFn: () => listMyTasks(params),
    placeholderData: keepPreviousData,
  });
}

const NO_FILTER: MyTaskParams = {
  tab: 'overdue',
  departmentId: '',
  priority: '',
  projectId: '',
  q: '',
  page: 1,
};

/** Badge Sidebar: số việc quá hạn (không lọc). Tải lại khi quay lại tab trình duyệt và mỗi 5 phút. */
export function useOverdueCount() {
  const query = useQuery({
    queryKey: myTaskKeys.overdue(),
    queryFn: () => listMyTasks(NO_FILTER),
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });
  return query.data?.meta.counts.overdue ?? 0;
}
