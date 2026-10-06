import { z } from 'zod';

export const dashboardIdSchema = z.uuid();

/** Tên bỏ trống → dùng tên phòng ban (crm_create_dashboard). */
export const createDashboardSchema = z
  .object({
    departmentId: z.uuid('Vui lòng chọn phòng ban'),
    name: z.string().trim().max(120, 'Tên Dashboard tối đa 120 ký tự').optional(),
    description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự').optional(),
  })
  .strict();

export const createdDashboardSchema = z.object({
  dashboardId: z.uuid(),
  created: z.boolean(),
});
