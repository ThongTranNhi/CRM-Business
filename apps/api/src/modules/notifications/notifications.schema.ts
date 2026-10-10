import { z } from 'zod';
import { paginationSchema } from '../../lib/pagination';

/** `?unread=true&page=&pageSize=` — chuông dùng pageSize=10. */
export const listNotificationsQuerySchema = paginationSchema.extend({
  unread: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});

/** Không gửi `ids` → đánh dấu tất cả đã đọc. */
export const markReadSchema = z
  .object({ ids: z.array(z.uuid()).min(1).max(100).optional() })
  .strict();
