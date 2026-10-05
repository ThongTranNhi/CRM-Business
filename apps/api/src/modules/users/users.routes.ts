import { Hono } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import {
  departmentOptions,
  detail,
  directory,
  employeeOptions,
  getProfile,
  patchEmployee,
  patchProfile,
  removeEmployee,
  resetPassword,
  restore,
} from './users.controller';
import { requireRole } from '../../middleware/permission.middleware';

export const userRoutes = new Hono<AppEnv>();
userRoutes.get('/me/profile', getProfile);
userRoutes.patch('/me/profile', patchProfile);
// Khai báo trước middleware chỉ-Super-Admin bên dưới: HR cũng cần ô chọn nhân viên.
userRoutes.get('/employees/options', requireRole('super_admin', 'hr_admin'), employeeOptions);
userRoutes.use('/employees', requireRole('super_admin'));
userRoutes.use('/employees/*', requireRole('super_admin'));
userRoutes.get('/employees', directory);
userRoutes.get('/employees/department-options', departmentOptions);
userRoutes.get('/employees/:id', detail);
userRoutes.patch('/employees/:id', patchEmployee);
userRoutes.delete('/employees/:id', removeEmployee);
userRoutes.post('/employees/:id/restore', restore);
userRoutes.post('/employees/:id/reset-password', resetPassword);
