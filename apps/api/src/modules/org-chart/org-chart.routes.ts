import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { orgChart } from './org-chart.controller';

/** /api/org-chart — Sơ đồ tổ chức, mọi role đã đăng nhập đều xem. */
export const orgChartRoutes = new Hono<AppEnv>();
orgChartRoutes.get('/', orgChart);
