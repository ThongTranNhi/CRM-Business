import { z } from 'zod';
import { OVERVIEW_PERIODS } from './overview.types';

/** `?period=week|month|quarter` — mặc định tháng này. */
export const executiveQuerySchema = z.object({
  period: z.enum(OVERVIEW_PERIODS).default('month'),
});

export type ExecutiveQuery = z.infer<typeof executiveQuerySchema>;
