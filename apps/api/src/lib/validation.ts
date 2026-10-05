import type { Context } from 'hono';
import { z } from 'zod';
import { AppError } from './app-error';

/** Validate input từ ngoài; sai thì trả 400 VALIDATION_ERROR kèm lỗi theo trường (docs/api/errors.md). */
export function parseInput<S extends z.ZodType>(schema: S, value: unknown): z.output<S> {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw new AppError(
      'VALIDATION_ERROR',
      'Dữ liệu không hợp lệ',
      400,
      z.flattenError(result.error).fieldErrors,
    );
  }
  return result.data;
}

/** Body JSON hỏng hoặc trống được coi là null để schema báo lỗi rõ ràng. */
export const readJson = (c: Context): Promise<unknown> => c.req.json().catch(() => null);
