import { z } from 'zod';

export const profileUpdateSchema = z.object({
  employeeCode: z.string().trim().min(1).max(50).nullable(),
  avatarPath: z.string().max(200).regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/).nullable().optional(),
}).strict();

export const employeeIdSchema = z.uuid();
export const directoryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10000).default(1),
});
export const adminEmployeeSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  jobTitle: z.string().trim().max(120).nullable(),
  departmentId: z.uuid().nullable(),
  status: z.enum(['active', 'disabled']),
}).strict();
