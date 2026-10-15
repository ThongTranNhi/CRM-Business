import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listWorkload } from '../api/workload.api';
import type { WorkloadParams } from '../types';
import { workloadKeys } from '../workload-keys';

/** Bảng khối lượng việc; giữ trang cũ khi đổi sắp xếp / trang để bảng không nháy. */
export function useWorkload(params: WorkloadParams) {
  return useQuery({
    queryKey: workloadKeys.list(params),
    queryFn: () => listWorkload(params),
    placeholderData: keepPreviousData,
  });
}
