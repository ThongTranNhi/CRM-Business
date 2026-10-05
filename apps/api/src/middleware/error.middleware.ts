import type { Context, ErrorHandler, NotFoundHandler } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import type { AppEnv } from '../lib/app-env';
import { AppError } from '../lib/app-error';

function errorBody(c: Context<AppEnv>, code: string, message: string, details?: unknown) {
  const error: Record<string, unknown> = { code, message, requestId: c.get('requestId') };
  if (details !== undefined) error.details = details;
  return { error };
}

/** Chuẩn hoá mọi lỗi về { error: { code, message, requestId } }. Không lộ chi tiết nội bộ. */
export const errorHandler: ErrorHandler<AppEnv> = (err, c) => {
  if (err instanceof AppError) {
    return c.json(errorBody(c, err.code, err.message, err.details), err.status);
  }
  if (err instanceof HTTPException) {
    const status = err.status as ContentfulStatusCode;
    return c.json(errorBody(c, 'HTTP_ERROR', err.message), status);
  }
  console.error(`[${c.get('requestId')}]`, err);
  return c.json(errorBody(c, 'INTERNAL_ERROR', 'Đã có lỗi xảy ra, vui lòng thử lại'), 500);
};

export const notFoundHandler: NotFoundHandler<AppEnv> = (c) =>
  c.json(errorBody(c, 'NOT_FOUND', 'Không tìm thấy đường dẫn'), 404);
