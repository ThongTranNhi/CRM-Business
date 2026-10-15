import { apiPage, withQuery } from '@/lib/api-client';
import type { WorkloadParams, WorkloadRow } from '../types';

export const WORKLOAD_PAGE_SIZE = 25;

export const listWorkload = ({ departmentId, sort, order, page }: WorkloadParams) =>
  apiPage<WorkloadRow>(
    withQuery('/api/workload', {
      departmentId,
      sort,
      order,
      page,
      pageSize: WORKLOAD_PAGE_SIZE,
    }),
  );
