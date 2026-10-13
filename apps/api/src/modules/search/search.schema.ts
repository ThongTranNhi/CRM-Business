import { z } from 'zod';
import { searchSchema } from '../../lib/pagination';

/**
 * `?q=` — gõ ≥ 2 ký tự mới tìm (frontend-spec 3.2). Sau khi bỏ ký tự đặc biệt của PostgREST có thể rỗng
 * (vd. "()") → undefined, service trả kết quả rỗng.
 */
export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'Nhập ít nhất 2 ký tự').max(100).pipe(searchSchema.unwrap()),
});
