import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput } from '../../lib/validation';
import { executiveQuerySchema } from './overview.schema';
import { getExecutiveOverview, getPersonalOverview } from './overview.service';

/** GET /api/overview/me — Tổng quan cá nhân (Đợt 4 S2). */
export async function me(c: Context<AppEnv>) {
  return c.json({ data: await getPersonalOverview(requestScope(c)) });
}

/** GET /api/overview/executive?period= — Tổng quan điều hành. */
export async function executive(c: Context<AppEnv>) {
  const query = parseInput(executiveQuerySchema, c.req.query());
  return c.json({ data: await getExecutiveOverview(requestScope(c), query) });
}
