import { z } from 'zod';

/** `?page=&pageSize=` theo docs/api/pagination.md: mặc định 20, tối đa 100. */
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type Pagination = z.infer<typeof paginationSchema>;

/**
 * `?q=` cho `ilike`: bỏ ký tự mang nghĩa đặc biệt trong cú pháp bộ lọc PostgREST (không ghép được bộ lọc khác),
 * rồi escape `%` và `_` (ký tự đại diện của LIKE) bằng `\` để tìm đúng chữ người dùng gõ. Đặt giá trị trong
 * ngoặc kép của PostgREST thì phải nhân đôi `\` (xem users.repository.ts).
 */
export const searchSchema = z
  .string()
  .trim()
  .max(100)
  .transform((value) => value.replace(/[*,()"\\]/g, '').replace(/[%_]/g, '\\$&') || undefined)
  .optional();

export interface Page<T> {
  data: T[];
  meta: Pagination & { total: number };
}

export function rangeParams({ page, pageSize }: Pagination): Record<'limit' | 'offset', string> {
  return { limit: String(pageSize), offset: String((page - 1) * pageSize) };
}

export function toPage<T>(rows: T[], total: number, pagination: Pagination): Page<T> {
  return { data: rows, meta: { ...pagination, total } };
}
