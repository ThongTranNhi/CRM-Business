import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Lỗi nghiệp vụ có chủ đích. error.middleware chuyển thành
 * { error: { code, message, requestId } } (docs/api/errors.md).
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: ContentfulStatusCode = 400,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const unauthenticated = () =>
  new AppError('UNAUTHENTICATED', 'Bạn cần đăng nhập để tiếp tục', 401);

export const forbidden = () =>
  new AppError('FORBIDDEN', 'Bạn không có quyền thực hiện thao tác này', 403);

export const notFound = (message = 'Không tìm thấy tài nguyên') =>
  new AppError('NOT_FOUND', message, 404);
