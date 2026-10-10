import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import { listNotificationsQuerySchema, markReadSchema } from './notifications.schema';
import * as notificationsService from './notifications.service';

export async function list(c: Context<AppEnv>) {
  const query = parseInput(listNotificationsQuerySchema, c.req.query());
  return c.json(await notificationsService.listNotifications(requestScope(c), query));
}

export async function markRead(c: Context<AppEnv>) {
  const { ids } = parseInput(markReadSchema, (await readJson(c)) ?? {});
  return c.json({ data: await notificationsService.markRead(requestScope(c), ids) });
}
