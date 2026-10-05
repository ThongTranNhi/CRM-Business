import { createMiddleware } from 'hono/factory';
import type { Role } from '../config/constants';
import type { AppEnv } from '../lib/app-env';
import { forbidden } from '../lib/app-error';

/**
 * Tầng 1 của phân quyền: chặn theo role. Tầng 2 (theo dữ liệu, vd. có phải
 * trưởng phòng này không) nằm trong service. Xem docs/architecture/permission-model.md.
 */
export function requireRole(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    if (!roles.includes(c.get('user').role)) throw forbidden();
    await next();
  });
}
