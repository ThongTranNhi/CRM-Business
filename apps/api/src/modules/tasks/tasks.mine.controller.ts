import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput } from '../../lib/validation';
import { listMyTasks } from './tasks.mine.service';
import { myTasksQuerySchema } from './tasks.schema';

/** GET /api/tasks/mine — Việc của tôi (Đợt 3 S2). */
export async function mine(c: Context<AppEnv>) {
  const query = parseInput(myTasksQuerySchema, c.req.query());
  return c.json(await listMyTasks(requestScope(c), query));
}
