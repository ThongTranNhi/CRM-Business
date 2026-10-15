import type { QueryKey } from '@tanstack/react-query';
import { z } from 'zod';
import { useToast } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api-client';
import {
  createTaskFormSchema,
  type CreateTaskErrors,
  type CreateTaskForm,
} from '../schemas/task.schema';
import { useCreateTask } from './useCreateTask';

/** Lỗi API hiện dưới đúng ô (docs/api/endpoints/tasks.md). */
const FIELD_OF_ERROR: Partial<Record<string, keyof CreateTaskForm>> = {
  ASSIGNEE_REQUIRED: 'assigneeId',
  EMPLOYEE_NOT_IN_BOARD: 'assigneeId',
  INVALID_DATE_RANGE: 'dueDate',
  PROJECT_NOT_FOUND: 'projectId',
  PROJECT_NOT_IN_DEPARTMENT: 'projectId',
};

/**
 * Validate (zod) rồi gửi form "Thêm công việc". Trả lỗi theo ô; thành công → toast + `onDone`;
 * lỗi không gắn được với ô nào → toast, giữ nguyên dữ liệu đã nhập.
 */
export function useSubmitTask(options: {
  boardId: string;
  relatedKeys: readonly QueryKey[];
  onDone: () => void;
}) {
  const toast = useToast();
  const create = useCreateTask(options.boardId, options.relatedKeys);

  async function submit(form: CreateTaskForm): Promise<CreateTaskErrors> {
    const parsed = createTaskFormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value?.[0]]));
    }
    const { startDate, dueDate, description, projectId, ...rest } = parsed.data;
    try {
      await create.mutateAsync({
        ...rest,
        startDate: startDate || null,
        dueDate: dueDate || null,
        description: description || null,
        projectId: projectId || null,
      });
      toast({ message: 'Đã tạo công việc' });
      options.onDone();
      return {};
    } catch (error) {
      const field = error instanceof ApiError ? FIELD_OF_ERROR[error.code] : undefined;
      if (field) return { [field]: errorMessage(error) };
      toast({ tone: 'error', message: errorMessage(error) });
      return {};
    }
  }

  return { submit, isPending: create.isPending };
}
