import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requireRole } from '../../middleware/permission.middleware';
import { addMember, create, detail, list, remove, restore, update } from './departments.controller';

const canManage = requireRole('super_admin', 'hr_admin');
const superAdminOnly = requireRole('super_admin');

export const departmentRoutes = new Hono<AppEnv>();
departmentRoutes.get('/', list);
departmentRoutes.get('/:id', detail);
departmentRoutes.post('/', canManage, create);
departmentRoutes.patch('/:id', canManage, update);
departmentRoutes.post('/:id/members', canManage, addMember);
departmentRoutes.delete('/:id', superAdminOnly, remove);
departmentRoutes.post('/:id/restore', superAdminOnly, restore);
