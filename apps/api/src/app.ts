import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { allowedOrigins } from './config/env';
import type { AppEnv } from './lib/app-env';
import { auth } from './middleware/auth.middleware';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { requestId } from './middleware/request-id.middleware';
import { healthRoutes } from './modules/health/health.routes';

export const app = new Hono<AppEnv>();

app.use('*', requestId);
app.use('/api/*', (c, next) =>
  cors({ origin: allowedOrigins(c.env.ALLOWED_ORIGINS ?? ''), credentials: true })(c, next),
);

// Route công khai
app.route('/api/health', healthRoutes);

// Mọi route bên dưới yêu cầu đăng nhập
app.use('/api/*', auth);
// Mount module tại đây, vd: app.route('/api/departments', departmentRoutes);

app.onError(errorHandler);
app.notFound(notFoundHandler);
