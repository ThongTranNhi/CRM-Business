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
    /** '' = không gắn dự án. */
    projectId: z.string(),
  })
  .refine((form) => !form.startDate || !form.dueDate || form.startDate <= form.dueDate, {
    message: 'Hạn không được trước ngày bắt đầu',
    path: ['dueDate'],
  });

export type CreateTaskForm = z.infer<typeof createTaskFormSchema>;
export type CreateTaskErrors = Partial<Record<keyof CreateTaskForm, string>>;

/** Ô thêm link kết quả / tài liệu ở drawer: chỉ http(s) (server kiểm tra lại); tên '' = không tên. */
export const taskLinkFormSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1, 'Vui lòng dán link')
    .max(2000, 'Link tối đa 2000 ký tự')
    .regex(/^https?:\/\/\S+$/i, 'Link phải bắt đầu bằng http:// hoặc https://'),
  title: z.string().trim().max(120, 'Tên link tối đa 120 ký tự'),
});

export type TaskLinkForm = z.infer<typeof taskLinkFormSchema>;
export type TaskLinkErrors = Partial<Record<keyof TaskLinkForm, string>>;
