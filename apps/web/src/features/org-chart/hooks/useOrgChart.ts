import { useQuery } from '@tanstack/react-query';
import { getOrgChart } from '../api/org-chart.api';

export const orgChartKeys = { all: ['org-chart'] as const };

/** Cơ cấu ít đổi trong ngày: giữ 5 phút trước khi tải lại. */
export function useOrgChart() {
  return useQuery({ queryKey: orgChartKeys.all, queryFn: getOrgChart, staleTime: 5 * 60_000 });
}
