import { useQuery } from '@tanstack/react-query';
import { getPersonalOverview } from '../api/overview.api';
import { overviewKeys } from '../overview-keys';

/** Thẻ số việc, việc sắp đến hạn, khối toàn công ty (Super Admin). Thông báo đọc riêng (chung cache với chuông). */
export function usePersonalOverview() {
  return useQuery({ queryKey: overviewKeys.personal(), queryFn: getPersonalOverview });
}
