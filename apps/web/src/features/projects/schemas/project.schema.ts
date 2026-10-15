import { z } from 'zod';
import { PROJECT_STATUSES } from '../project.utils';

/** Form tạo / sửa dự án. Ngày từ input date: '' = không chọn; '' ở ô chọn = không có. */
export const projectFormSchema = z
  .object({
    departmentId: z.string().min(1, 'Vui lòng chọn phòng ban'),
    name: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập tên dự án')
      .max(120, 'Tên dự án tối đa 120 ký tự'),
    description: z.string().trim().max(2000, 'Mô tả dự án tối đa 2000 ký tự'),
    ownerEmployeeId: z.string(),
    status: z.enum(PROJECT_STATUSES),
    startDate: z.string(),
    dueDate: z.string(),
    memberIds: z.array(z.string()),
  })
  .refine((form) => !form.startDate || !form.dueDate || form.startDate <= form.dueDate, {
    message: 'Hạn không được trước ngày bắt đầu',
    path: ['dueDate'],
  });

export type ProjectForm = z.infer<typeof projectFormSchema>;
export type ProjectFormErrors = Partial<Record<keyof ProjectForm, string>>;
