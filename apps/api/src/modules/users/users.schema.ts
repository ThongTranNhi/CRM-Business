import { z } from 'zod';
import { paginationSchema, searchSchema } from '../../lib/pagination';

export const profileUpdateSchema = z
  .object({
    employeeCode: z.string().trim().min(1).max(50).nullable(),
    avatarPath: z
      .string()
      .max(200)
      .regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/)
      .nullable()
      .optional(),
  })
  .strict();

export const employeeIdSchema = z.uuid();

/** Đang làm (mặc định) · Đã khoá · Đã xoá; tìm theo tên / mã nhân viên / username. */
export const directoryQuerySchema = paginationSchema.extend({
  pageSize: z.coerce.number().int().min(1).max(100).default(25),
  status: z.enum(['active', 'locked', 'deleted']).default('active'),
  q: searchSchema,
});

/** departmentId: chỉ người của một phòng (vd. người nhận bàn giao — mặc định cùng phòng). */
export const employeeOptionsQuerySchema = z.object({
  q: searchSchema,
  departmentId: z.uuid().optional(),
});

export const adminEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(1).max(120),
    jobTitle: z.string().trim().max(120).nullable(),
    departmentId: z.uuid().nullable(),
    status: z.enum(['active', 'disabled']),
  })
  .strict();

/**
 * newManagerId: trưởng phòng mới cho phòng mà người bị xoá đang quản lý (tuỳ chọn).
 * handoverEmployeeId: người nhận mọi việc đang mở (BR-53, tuỳ chọn — bỏ qua thì việc giữ nguyên).
 */
export const deleteEmployeeSchema = z
  .object({
    newManagerId: z.uuid().nullable().default(null),
    handoverEmployeeId: z.uuid().nullable().default(null),
  })
  .strict();
