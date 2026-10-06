import { supabase } from './supabase';

/** Lỗi từ API: `code` ổn định để xử lý theo trường hợp (docs/api/errors.md). */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status: number,
    /** `error.details` của API, vd. `{ dashboardId }` khi 409 DASHBOARD_ALREADY_EXISTS. */
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/** Câu thông báo hiển thị được cho người dùng từ một lỗi bất kỳ. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Không thể xử lý yêu cầu, vui lòng thử lại';
}

export const hasErrorCode = (error: unknown, code: string): boolean =>
  error instanceof ApiError && error.code === code;

export interface PageMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface PageResult<T> {
  data: T[];
  meta: PageMeta;
}

// Kiểu dữ liệu của từng endpoint bám theo docs/api/endpoints/*.
interface ApiEnvelope<T> {
  data: T;
  meta?: PageMeta;
  error?: { code: string; message: string; details?: unknown };
}

async function send<T>(path: string, init: RequestInit): Promise<ApiEnvelope<T>> {
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new ApiError('Bạn cần đăng nhập', 'UNAUTHENTICATED', 401);
  const response = await fetch(`${import.meta.env.VITE_API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${data.session.access_token}`,
      ...init.headers,
    },
  });
  const body: ApiEnvelope<T> = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message ?? 'Không thể xử lý yêu cầu, vui lòng thử lại';
    throw new ApiError(
      message,
      body.error?.code ?? 'UNKNOWN_ERROR',
      response.status,
      body.error?.details,
    );
  }
  return body;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  return (await send<T>(path, init)).data;
}

export async function apiPage<T>(path: string): Promise<PageResult<T>> {
  const body = await send<T[]>(path, {});
  const fallback = { page: 1, pageSize: body.data.length, total: body.data.length };
  return { data: body.data, meta: body.meta ?? fallback };
}

/** Bỏ tham số rỗng: `withQuery('/api/x', { q: '', page: 2 })` → `/api/x?page=2`. */
export function withQuery(path: string, params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const text = query.toString();
  return text ? `${path}?${text}` : path;
}
