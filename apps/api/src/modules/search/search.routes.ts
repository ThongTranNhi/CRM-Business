import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { search } from './search.controller';

/** /api/search?q= — ô tìm kiếm ở Header (mọi role; quyền từng nhóm ở service). */
export const searchRoutes = new Hono<AppEnv>();
searchRoutes.get('/', search);
