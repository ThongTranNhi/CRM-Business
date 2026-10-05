import type { Env } from '../config/env';
import { AppError } from './app-error';

/** Server-only REST access; never log upstream bodies or keys. */
export async function supabaseRequest<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    if (body && typeof body === 'object' && 'code' in body && body.code === '23505') {
      throw new AppError('EMPLOYEE_CODE_EXISTS', 'Mã nhân viên đã được sử dụng', 409);
    }
    if (body && typeof body === 'object' && 'code' in body && body.code === '23503') {
      throw new AppError('EMPLOYEE_RELATION_CONFLICT', 'Không thể đổi phòng ban: kiểm tra người phụ trách phòng hiện tại và các liên kết hồ sơ', 409);
    }
    throw new AppError('DATABASE_UNAVAILABLE', 'Không thể xử lý dữ liệu, vui lòng thử lại', 503);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
