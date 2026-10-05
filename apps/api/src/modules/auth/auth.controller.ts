import type { Context } from 'hono';
import { readEnv } from '../../config/env';
import type { AppEnv } from '../../lib/app-env';
import { AppError } from '../../lib/app-error';
import { credentialsSchema, newPasswordSchema } from './auth.schema';
import { changeOwnPassword, getSessionContext, loginLocal, registerLocal, throttleAuth } from './auth.service';

async function credentials(c: Context<AppEnv>) {
  const parsed = credentialsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new AppError('INVALID_INPUT', 'Username 3–32 ký tự; mật khẩu 12–128 ký tự');
  const env = readEnv(c.env);
  const ip = c.req.header('CF-Connecting-IP') ?? 'local';
  await throttleAuth(env, `${c.req.path}:ip:${ip}`);
  await throttleAuth(env, `${c.req.path}:username:${parsed.data.username}`);
  return { env, ...parsed.data };
}
export async function register(c: Context<AppEnv>) {
  const { env, username, password } = await credentials(c);
  return c.json({ data: await registerLocal(env, username, password) }, 201);
}
export async function login(c: Context<AppEnv>) {
  const { env, username, password } = await credentials(c);
  c.header('Cache-Control', 'no-store');
  return c.json({ data: await loginLocal(env, username, password) });
}
export async function me(c: Context<AppEnv>) {
  return c.json({ data: await getSessionContext(readEnv(c.env), c.get('user').id, c.get('user').sessionId) });
}
export async function changePassword(c: Context<AppEnv>) {
  const body: unknown = await c.req.json().catch(() => null);
  const credentials = credentialsSchema.safeParse(body && typeof body === 'object'
    ? { username: 'username' in body ? body.username : '', password: 'currentPassword' in body ? body.currentPassword : '' } : null);
  const next = newPasswordSchema.safeParse(body && typeof body === 'object'
    ? { password: 'password' in body ? body.password : '' } : null);
  if (!credentials.success || !next.success) throw new AppError('INVALID_INPUT', 'Thông tin mật khẩu không hợp lệ');
  const env = readEnv(c.env);
  await throttleAuth(env, `change-password:${c.get('user').id}`);
  c.header('Cache-Control', 'no-store');
  return c.json({ data: await changeOwnPassword(env, c.get('user').id, c.get('user').sessionId,
    credentials.data.username, credentials.data.password, next.data.password) });
}
