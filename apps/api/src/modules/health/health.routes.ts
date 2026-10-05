import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';

export const healthRoutes = new Hono<AppEnv>().get('/', (c) =>
  c.json({ status: 'ok', time: new Date().toISOString() }),
);
