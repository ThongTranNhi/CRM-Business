import { createMiddleware } from 'hono/factory';
import { REQUEST_ID_HEADER } from '../config/constants';
import type { AppEnv } from '../lib/app-env';

/** Gắn mã request cho mỗi lượt gọi, trả lại ở header để tra log. */
export const requestId = createMiddleware<AppEnv>(async (c, next) => {
  const id = c.req.header(REQUEST_ID_HEADER) ?? crypto.randomUUID();
  c.set('requestId', id);
  c.header(REQUEST_ID_HEADER, id);
  await next();
});
