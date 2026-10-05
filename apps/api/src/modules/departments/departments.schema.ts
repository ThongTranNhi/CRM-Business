import { z } from 'zod';
import { paginationSchema, searchSchema } from '../../lib/pagination';

const departmentName = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên phòng ban')
  .max(120, 'Tên phòng ban tối đa 120 ký tự');

export const departmentIdSchema = z.uuid();

export const listDepartmentsQuerySchema = paginationSchema.extend({
  status: z.enum(['active', 'deleted']).default('active'),
  q: searchSchema,
});

export const createDepartmentSchema = z
  .object({ name: departmentName, managerId: z.uuid().nullable().default(null) })
  .strict();

/** managerId: bỏ qua = giữ nguyên; null = bỏ trưởng phòng. */
export const updateDepartmentSchema = z
  .object({ name: departmentName.optional(), managerId: z.uuid().nullable().optional() })
  .strict()
  .refine((input) => input.name !== undefined || input.managerId !== undefined, {
    message: 'Không có thay đổi nào',
  });

/** replacementManagerId: trưởng phòng mới cho phòng cũ khi người được chuyển đang là trưởng phòng. */
export const addMemberSchema = z
  .object({ employeeId: z.uuid(), replacementManagerId: z.uuid().nullable().default(null) })
  .strict();

export const deleteDepartmentSchema = z
  .object({ receivingDepartmentId: z.uuid().nullable().default(null) })
  .strict();
