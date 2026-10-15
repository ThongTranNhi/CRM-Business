import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';
import { WORKLOAD_SORTS } from './workload.types';

/** `?departmentId=&sort=&order=&page=&pageSize=` — mặc định nhiều việc đang mở nhất trước. */
export const workloadQuerySchema = paginationSchema.extend({
  departmentId: z.uuid().optional(),
  sort: z.enum(WORKLOAD_SORTS).default('open'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type WorkloadQuery = z.infer<typeof workloadQuerySchema>;
