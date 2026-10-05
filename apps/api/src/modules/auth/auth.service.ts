import { decodeJwt } from 'jose';
import type { Env } from '../../config/env';
import { AppError, unauthenticated } from '../../lib/app-error';
import { supabaseRequest } from '../../lib/supabase';
import {
  authRequest,
  findLocalIdentity,
  findUsernameAccount,
  sessionContext,
  usernameExists,
  type TokenPair,
} from './auth.repository';

const duplicateUsername = () => new AppError('USERNAME_EXISTS', 'Tên đăng nhập đã tồn tại', 409);

export async function registerLocal(env: Env, username: string, password: string) {
  if (await usernameExists(env, username)) throw duplicateUsername();
  // Reserved .invalid namespace: internal Auth identifier, never delivered as email.
  // Admin creation auto-confirms this technical identifier, not a human email address.
  let created: { id: string };
  try {
    created = await authRequest<{ id: string }>(env, '/admin/users', {
      email: `${crypto.randomUUID()}@accounts.crm-business.invalid`,
      password,
      email_confirm: true,
      app_metadata: { account_type: 'local', username, role: 'employee' },
      user_metadata: { full_name: username },
    });
  } catch (error) {
    // Unique constraint is the final guard when two registrations arrive together.
    if (await usernameExists(env, username)) throw duplicateUsername();
    throw error;
  }
  const account = await findUsernameAccount(env, username);
  if (!account || account.auth_user_id !== created.id) {
    throw new AppError(
      'USERNAME_SYNC_REQUIRED',
      'Tài khoản đã tạo nhưng username chưa được đồng bộ. Vui lòng liên hệ quản trị viên.',
      503,
    );
  }
  return { registered: true };
}

export async function loginLocal(env: Env, username: string, password: string) {
  const identity = await findLocalIdentity(env, username);
  if (!identity || identity.status !== 'active') throw unauthenticated();
  try {
    return await authRequest<TokenPair>(env, '/token?grant_type=password', {
      email: identity.email,
      password,
    });
  } catch (error) {
    if (error instanceof AppError && error.status === 400) throw unauthenticated();
    throw error;
  }
}

export async function getSessionContext(env: Env, userId: string, sessionId: string) {
  const state = await sessionContext(env, userId, sessionId);
  if (!state || state.status !== 'active') throw unauthenticated();
  return state;
}

export async function setLocalPassword(env: Env, userId: string, password: string) {
  await authRequest(env, `/admin/users/${userId}`, { password }, 'PUT');
}

export async function changeOwnPassword(
  env: Env,
  userId: string,
  sessionId: string,
  username: string,
  currentPassword: string,
  password: string,
) {
  const state = await getSessionContext(env, userId, sessionId);
  if (!state.username || state.username !== username || currentPassword === password) {
    throw new AppError(
      'INVALID_PASSWORD_CHANGE',
      'Kiểm tra tài khoản và dùng mật khẩu mới khác mật khẩu hiện tại',
    );
  }
  const identity = await findLocalIdentity(env, username);
  if (!identity || identity.auth_user_id !== userId) throw unauthenticated();
  const tokens = await authRequest<TokenPair>(env, '/token?grant_type=password', {
    email: identity.email,
    password: currentPassword,
  });
  const reauthenticated = decodeJwt(tokens.access_token);
  if (reauthenticated.sub !== userId || typeof reauthenticated.session_id !== 'string')
    throw unauthenticated();
  await setLocalPassword(env, userId, password);
  const freshTokens = await authRequest<TokenPair>(env, '/token?grant_type=password', {
    email: identity.email,
    password,
  });
  const freshClaims = decodeJwt(freshTokens.access_token);
  if (freshClaims.sub !== userId || typeof freshClaims.session_id !== 'string')
    throw unauthenticated();
  await supabaseRequest(env, '/rest/v1/rpc/crm_finish_password_change', {
    method: 'POST',
    body: JSON.stringify({
      user_uuid: userId,
      session_uuid: freshClaims.session_id,
      expected_version: state.resetVersion,
    }),
  });
  return freshTokens;
}

export async function throttleAuth(env: Env, key: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(key));
  const keyHash = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  const allowed = await supabaseRequest<boolean>(env, '/rest/v1/rpc/crm_auth_rate_limit', {
    method: 'POST',
    body: JSON.stringify({ key_hash: keyHash }),
  });
  if (!allowed)
    throw new AppError('RATE_LIMITED', 'Quá nhiều yêu cầu. Vui lòng thử lại sau một phút.', 429);
}
