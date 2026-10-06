import type { Env } from '../../config/env';
import { AppError } from '../../lib/app-error';
import { supabaseRequest } from '../../lib/supabase';

export interface SessionContext {
  id: string;
  role: string;
  status: string;
  username: string | null;
  mustChangePassword: boolean;
  resetVersion: number;
  /** Nhãn Super Admin (CEO / Master) từ allowlist; null với role khác. Chỉ để hiển thị. */
  adminTitle: string | null;
}
export interface TokenPair {
  access_token: string;
  refresh_token: string;
}

export const usernameExists = (env: Env, username: string) =>
  supabaseRequest<boolean>(env, '/rest/v1/rpc/crm_username_exists', {
    method: 'POST',
    body: JSON.stringify({ candidate_username: username }),
  });

export async function findUsernameAccount(env: Env, username: string) {
  const params = new URLSearchParams({
    select: 'auth_user_id,status',
    username: `eq.${username}`,
    limit: '1',
  });
  const rows = await supabaseRequest<{ auth_user_id: string; status: string }[]>(
    env,
    `/rest/v1/app_accounts?${params}`,
  );
  return rows[0] ?? null;
}

export async function authRequest<T>(
  env: Env,
  path: string,
  body: unknown,
  method = 'POST',
): Promise<T> {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1${path}`, {
    method,
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new AppError(
      'AUTH_FAILED',
      'Không thể xử lý tài khoản. Kiểm tra thông tin hoặc thử lại sau.',
      response.status >= 500 ? 503 : 400,
    );
  }
  return response.json() as Promise<T>;
}

export async function findLocalIdentity(env: Env, username: string) {
  const account = await findUsernameAccount(env, username);
  if (!account) return null;
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/admin/users/${account.auth_user_id}`, {
    headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY },
  });
  if (!response.ok) throw new AppError('AUTH_UNAVAILABLE', 'Dịch vụ tài khoản chưa sẵn sàng', 503);
  const user = (await response.json()) as { email: string };
  return { ...account, email: user.email };
}

export interface EmployeeSummary {
  employeeId: string;
  fullName: string;
  departmentId: string | null;
  departmentName: string | null;
}

export async function findEmployeeSummary(
  env: Env,
  userId: string,
): Promise<EmployeeSummary | null> {
  const params = new URLSearchParams({
    select: 'id,full_name,department_id,department_name',
    auth_user_id: `eq.${userId}`,
    limit: '1',
  });
  const rows = await supabaseRequest<
    {
      id: string;
      full_name: string;
      department_id: string | null;
      department_name: string | null;
    }[]
  >(env, `/rest/v1/active_employees?${params}`);
  const row = rows[0];
  if (!row) return null;
  return {
    employeeId: row.id,
    fullName: row.full_name,
    departmentId: row.department_id,
    departmentName: row.department_name,
  };
}

export const sessionContext = (env: Env, userId: string, sessionId: string) =>
  supabaseRequest<SessionContext | null>(env, '/rest/v1/rpc/crm_session_context', {
    method: 'POST',
    body: JSON.stringify({ user_uuid: userId, session_uuid: sessionId }),
  });
