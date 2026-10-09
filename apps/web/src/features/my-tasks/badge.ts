import { useQuery } from '@tanstack/react-query';
import { getMyTaskCounts } from './api/my-tasks.api';
import { myTaskKeys } from './hooks/my-task-keys';

// Entry nhỏ cho layout và các module khác (Sidebar, board): KHÔNG import trang để route
// /app/my-tasks vẫn được tải lười (index.ts chỉ dành cho router).

export { myTaskKeys };

/** Badge Sidebar: số việc quá hạn của tôi. Tải lại khi quay lại tab trình duyệt và mỗi 5 phút. */
export function useOverdueCount() {
  const query = useQuery({
    queryKey: myTaskKeys.counts(),
    queryFn: getMyTaskCounts,
    refetchOnWindowFocus: true,
    refetchInterval: 5 * 60_000,
  });
  return query.data?.overdue ?? 0;
}
