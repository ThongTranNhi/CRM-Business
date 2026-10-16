import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { getPersonalOverview } from './overview.service';

/** GET /api/overview/me — Tổng quan cá nhân (Đợt 4 S2). */
export async function me(c: Context<AppEnv>) {
  return c.json({ data: await getPersonalOverview(requestScope(c)) });
}
