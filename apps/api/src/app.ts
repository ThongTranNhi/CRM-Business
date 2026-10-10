import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { allowedOrigins } from './config/env';
import type { AppEnv } from './lib/app-env';
import { auth } from './middleware/auth.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestId } from './middleware/request-id.middleware';
import { healthRoutes } from './modules/health/health.routes';
import { departmentDashboardRoutes } from './modules/department-dashboards/department-dashboards.routes';
import { departmentRoutes } from './modules/departments/departments.routes';
import { notificationRoutes } from './modules/notifications/notifications.routes';
import { projectRoutes } from './modules/projects/projects.routes';
import { boardRoutes, taskRoutes } from './modules/tasks/tasks.routes';
import { userRoutes } from './modules/users/users.routes';
import { publicAuthRoutes, privateAuthRoutes } from './modules/auth/auth.routes';

export const app = new Hono<AppEnv>();

app.use('*', requestId);
app.use('/api/*', async (c, next) => {
  c.header('Cache-Control', 'no-store');
  await next();
});
app.use('/api/*', (c, next) =>
  cors({ origin: allowedOrigins(c.env.ALLOWED_ORIGINS ?? ''), credentials: true })(c, next),
);

// Route công khai
app.route('/api/health', healthRoutes);
app.route('/api/auth', publicAuthRoutes);

// Mọi route bên dưới yêu cầu đăng nhập
app.use('/api/*', auth);
app.route('/api/auth', privateAuthRoutes);
app.route('/api/users', userRoutes);
app.route('/api/departments', departmentRoutes);
app.route('/api/department-dashboards', departmentDashboardRoutes);
app.route('/api/boards', boardRoutes);
app.route('/api/tasks', taskRoutes);
app.route('/api/projects', projectRoutes);
app.route('/api/notifications', notificationRoutes);

app.onError(errorHandler);
app.notFound(notFoundHandler);
