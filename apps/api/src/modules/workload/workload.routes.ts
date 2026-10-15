import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requireRole } from '../../middleware/permission.middleware';
import { list } from './workload.controller';
import { WORKLOAD_ROLES } from './workload.service';

/** /api/workload — Super Admin, Trưởng phòng, Trưởng nhóm (phạm vi phòng ban ở service). */
export const workloadRoutes = new Hono<AppEnv>();
workloadRoutes.get('/', requireRole(...WORKLOAD_ROLES), list);
