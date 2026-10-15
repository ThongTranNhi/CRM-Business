import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput } from '../../lib/validation';
import { workloadQuerySchema } from './workload.schema';
import { listWorkload } from './workload.service';

/** GET /api/workload — Khối lượng việc (Đợt 4 S1). */
export async function list(c: Context<AppEnv>) {
  const query = parseInput(workloadQuerySchema, c.req.query());
  return c.json(await listWorkload(requestScope(c), query));
}
