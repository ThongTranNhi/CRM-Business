import { z } from 'zod';

/** Tên bỏ trống → API dùng tên phòng ban. */
export const createDashboardFormSchema = z.object({
  departmentId: z.string().min(1, 'Vui lòng chọn phòng ban'),
  name: z.string().trim().max(120, 'Tên Dashboard tối đa 120 ký tự'),
  description: z.string().trim().max(1000, 'Mô tả tối đa 1000 ký tự'),
});

export type CreateDashboardForm = z.infer<typeof createDashboardFormSchema>;
export type CreateDashboardErrors = Partial<Record<keyof CreateDashboardForm, string>>;
