import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { departmentOptions, detail, directory, getProfile, patchEmployee, patchProfile, resetPassword } from './users.controller';
import { requireRole } from '../../middleware/permission.middleware';

export const userRoutes = new Hono<AppEnv>();
userRoutes.get('/me/profile', getProfile);
userRoutes.patch('/me/profile', patchProfile);
userRoutes.use('/employees', requireRole('super_admin'));
userRoutes.use('/employees/*', requireRole('super_admin'));
userRoutes.get('/employees', directory);
userRoutes.get('/employees/department-options', departmentOptions);
userRoutes.get('/employees/:id', detail);
userRoutes.patch('/employees/:id', patchEmployee);
userRoutes.post('/employees/:id/reset-password', resetPassword);
