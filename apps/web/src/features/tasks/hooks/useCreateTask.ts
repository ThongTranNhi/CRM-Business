import { useMutation, type QueryKey } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { createTask } from '../api/tasks.api';
import type { CreateTaskInput } from '../types';
import { taskKeys } from './task-keys';

/** Tạo task trong board; làm mới board và `relatedKeys` (vd. số liệu thẻ Workspace). */
export function useCreateTask(boardId: string, relatedKeys: readonly QueryKey[]) {
  const invalidate = useInvalidateQueries([taskKeys.boards(), ...relatedKeys]);
  return useMutation({
    mutationFn: (input: CreateTaskInput) => createTask(boardId, input),
    onSuccess: invalidate,
  });
}
