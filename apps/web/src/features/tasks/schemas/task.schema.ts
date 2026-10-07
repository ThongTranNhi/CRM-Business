import { z } from 'zod';
import { PRIORITIES } from '../task.utils';

/** Form "Thêm công việc" (task-management.md). Ngày từ input date: '' = không chọn. */
export const createTaskFormSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập tên công việc')
      .max(200, 'Tên công việc tối đa 200 ký tự'),
    assigneeId: z.string().min(1, 'Mỗi công việc cần đúng một người phụ trách chính'),
    collaboratorIds: z.array(z.string()),
    priority: z.enum(PRIORITIES),
    startDate: z.string(),
    dueDate: z.string(),
    description: z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự'),
  })
  .refine((form) => !form.startDate || !form.dueDate || form.startDate <= form.dueDate, {
    message: 'Hạn không được trước ngày bắt đầu',
    path: ['dueDate'],
  });

export type CreateTaskForm = z.infer<typeof createTaskFormSchema>;
export type CreateTaskErrors = Partial<Record<keyof CreateTaskForm, string>>;
