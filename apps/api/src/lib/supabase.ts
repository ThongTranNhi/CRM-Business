import { z } from 'zod';
import type { Env } from '../config/env';
import { AppError } from './app-error';

/** Mã lỗi RPC (`raise exception 'CODE'`) hoặc SQLSTATE → lỗi nghiệp vụ có nghĩa. */
export type DatabaseErrorMap = Record<string, () => AppError>;

export interface SupabaseRequestInit extends RequestInit {
  errors?: DatabaseErrorMap;
}

const postgrestErrorSchema = z.object({ code: z.string(), message: z.string() });

const databaseUnavailable = () =>
  new AppError('DATABASE_UNAVAILABLE', 'Không thể xử lý dữ liệu, vui lòng thử lại', 503);

async function toAppError(response: Response, errors: DatabaseErrorMap): Promise<AppError> {
  const parsed = postgrestErrorSchema.safeParse(await response.json().catch(() => null));
  if (!parsed.success) return databaseUnavailable();
  const key = [parsed.data.message, parsed.data.code].find((candidate) =>
    Object.hasOwn(errors, candidate),
  );
  return key ? errors[key]!() : databaseUnavailable();
}

async function send(env: Env, path: string, init: SupabaseRequestInit) {
  const { errors = {}, headers, ...rest } = init;
  const response = await fetch(`${env.SUPABASE_URL}${path}`, {
    ...rest,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      'Content-Type': 'application/json',
      ...headers,
    },
  });
  if (!response.ok) throw await toAppError(response, errors);
  return response;
}

/** Server-only REST access; never log upstream bodies or keys. */
export async function supabaseRequest<T>(
  env: Env,
  path: string,
  init: SupabaseRequestInit = {},
): Promise<T> {
  const response = await send(env, path, init);
  if (response.status === 204) return undefined as T;
  const body: T = await response.json();
  return body;
}

/** Đọc một trang kèm tổng số bản ghi (header Content-Range của PostgREST). */
export async function supabaseList<T>(
  env: Env,
  path: string,
): Promise<{ rows: T[]; total: number }> {
  const response = await send(env, path, { headers: { Prefer: 'count=exact' } });
  const total = Number(response.headers.get('Content-Range')?.split('/')[1] ?? 0);
  const rows: T[] = await response.json();
  return { rows, total: Number.isFinite(total) ? total : 0 };
}

export interface RpcCall {
  name: string;
  args: object;
  errors?: DatabaseErrorMap;
}

/** Gọi Postgres function qua PostgREST. */
export const callRpc = <T = void>(env: Env, { name, args, errors }: RpcCall) =>
  supabaseRequest<T>(env, `/rest/v1/rpc/${name}`, {
    method: 'POST',
    body: JSON.stringify(args),
    errors,
  });
