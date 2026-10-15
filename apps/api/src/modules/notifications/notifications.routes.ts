import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { list, markRead } from './notifications.controller';

/** /api/notifications — thông báo của người đăng nhập (mọi role). */
export const notificationRoutes = new Hono<AppEnv>();
notificationRoutes.get('/', list);
notificationRoutes.post('/read', markRead);
