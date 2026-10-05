import { createMiddleware } from 'hono/factory';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import { DEFAULT_ROLE, ROLES, type Role } from '../config/constants';
import { readEnv } from '../config/env';
import type { AppEnv } from '../lib/app-env';
import { unauthenticated } from '../lib/app-error';

// JWKS được cache theo URL trong vòng đời của Worker isolate.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(supabaseUrl: string) {
  let jwks = jwksCache.get(supabaseUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL('/auth/v1/.well-known/jwks.json', supabaseUrl));
    jwksCache.set(supabaseUrl, jwks);
  }
  return jwks;
}

interface SupabaseClaims extends JWTPayload {
  email?: string;
  app_metadata?: { role?: unknown };
}

/** Role chỉ đọc từ app_metadata (server mới ghi được). KHÔNG dùng user_metadata. */
function readRole(claims: SupabaseClaims): Role {
  const role = claims.app_metadata?.role;
  return ROLES.includes(role as Role) ? (role as Role) : DEFAULT_ROLE;
}

export const auth = createMiddleware<AppEnv>(async (c, next) => {
  const header = c.req.header('Authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw unauthenticated();

  const env = readEnv(c.env);
  let claims: SupabaseClaims;
  try {
    const result = await jwtVerify<SupabaseClaims>(token, getJwks(env.SUPABASE_URL), {
      issuer: new URL('/auth/v1', env.SUPABASE_URL).toString(),
    });
    claims = result.payload;
  } catch {
    throw unauthenticated();
  }
  if (!claims.sub) throw unauthenticated();

  c.set('user', { id: claims.sub, email: claims.email ?? null, role: readRole(claims) });
  await next();
});
