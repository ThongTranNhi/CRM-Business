import type { Role } from '../config/constants';
import type { Bindings } from '../config/env';

export interface AuthUser {
  id: string;
  email: string | null;
  role: Role;
  sessionId: string;
}

/** Kiểu dùng chung cho mọi Hono app/route trong API. */
export interface AppEnv {
  Bindings: Bindings;
  Variables: {
    requestId: string;
    user: AuthUser;
  };
}
