import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requireRole } from '../../middleware/permission.middleware';
import { create, detail, list } from './department-dashboards.controller';

export const departmentDashboardRoutes = new Hono<AppEnv>();
departmentDashboardRoutes.get('/', list);
departmentDashboardRoutes.get('/:id', detail);
departmentDashboardRoutes.post('/', requireRole('super_admin', 'department_manager'), create);
