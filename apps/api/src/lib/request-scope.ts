import type { Context } from 'hono';
import type { Role } from '../config/constants';
import { readEnv, type Env } from '../config/env';
import type { AppEnv, AuthUser } from './app-env';
import { forbidden } from './app-error';

/** Những gì service cần từ một request, để service không phụ thuộc Context của Hono. */
export interface RequestScope {
  env: Env;
  actor: AuthUser;
}

export function requestScope(c: Context<AppEnv>): RequestScope {
  return { env: readEnv(c.env), actor: c.get('user') };
}

/** Tầng kiểm tra role trong service (bên cạnh requireRole ở route và kiểm tra trong RPC). */
export function assertRole(actor: AuthUser, roles: readonly Role[]): void {
  if (!roles.includes(actor.role)) throw forbidden();
}
