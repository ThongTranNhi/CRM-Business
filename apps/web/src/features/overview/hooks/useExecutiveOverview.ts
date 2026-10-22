import { useQuery } from '@tanstack/react-query';
import { getExecutiveOverview } from '../api/overview.api';
import { overviewKeys } from '../overview-keys';
import type { OverviewPeriod } from '../types';

/** Tổng quan điều hành theo kỳ; phạm vi phòng do server quyết định theo vai trò. */
export function useExecutiveOverview(period: OverviewPeriod) {
  return useQuery({
    queryKey: overviewKeys.executive(period),
    queryFn: () => getExecutiveOverview(period),
  });
}
