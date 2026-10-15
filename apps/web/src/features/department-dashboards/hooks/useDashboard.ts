import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '../api/department-dashboards.api';
import { dashboardKeys } from './dashboard-keys';

// Header board (tên, phòng, thành viên, quyền) ít đổi: không tự tải lại theo chu kỳ như board.
const STALE_MS = 3 * 60_000;

export function useDashboard(id: string) {
  return useQuery({
    queryKey: dashboardKeys.detail(id),
    queryFn: () => getDashboard(id),
    staleTime: STALE_MS,
  });
}
