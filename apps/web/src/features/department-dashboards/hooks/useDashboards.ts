import { useMutation, useQuery } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { createDashboard, listDashboards } from '../api/department-dashboards.api';
import { dashboardKeys } from './dashboard-keys';

// Số việc trên thẻ đổi khi người khác thao tác: làm mới sau 30 giây hoặc khi quay lại tab.
const STALE_MS = 30_000;

export function useDashboards() {
  return useQuery({ queryKey: dashboardKeys.list(), queryFn: listDashboards, staleTime: STALE_MS });
}

/** Tạo Dashboard làm đổi cả cột Dashboard ở trang Phòng ban. */
export function useCreateDashboard() {
  const invalidate = useInvalidateQueries([dashboardKeys.all, ['departments']]);
  return useMutation({ mutationFn: createDashboard, onSuccess: invalidate });
}
