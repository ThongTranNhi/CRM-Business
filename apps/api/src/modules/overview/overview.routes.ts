import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { me } from './overview.controller';

/** /api/overview — Tổng quan (mọi role; khối toàn công ty chỉ Super Admin, kiểm tra ở service). */
export const overviewRoutes = new Hono<AppEnv>();
overviewRoutes.get('/me', me);
