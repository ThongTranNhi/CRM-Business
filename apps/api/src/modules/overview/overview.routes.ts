import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requireRole } from '../../middleware/permission.middleware';
import { executive, me } from './overview.controller';
import { EXECUTIVE_ROLES } from './overview.service';

/** /api/overview — `/me` mọi role (khối toàn công ty chỉ Super Admin, kiểm tra ở service); `/executive` Super
 * Admin và Trưởng phòng (phạm vi phòng ở service). */
export const overviewRoutes = new Hono<AppEnv>();
overviewRoutes.get('/me', me);
overviewRoutes.get('/executive', requireRole(...EXECUTIVE_ROLES), executive);
