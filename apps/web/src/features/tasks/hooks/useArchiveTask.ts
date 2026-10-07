import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { archiveTask, restoreTask } from '../api/tasks.api';
import type { BoardData } from '../types';
import { taskKeys } from './task-keys';

interface UseArchiveTaskOptions {
  boardKey: QueryKey;
  relatedKeys: readonly QueryKey[];
}

/**
 * Xoá (lưu trữ, BR-19): thẻ biến mất ngay (optimistic), lỗi thì trả lại. Toast "Đã xoá công việc"
 * kèm [Hoàn tác] trong 5 giây → POST /restore, task về cuối cột cũ.
 */
export function useArchiveTask({ boardKey, relatedKeys }: UseArchiveTaskOptions) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all(
      [taskKeys.boards(), ...relatedKeys].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );
  const restore = useMutation({
    mutationFn: restoreTask,
    onSuccess: () => toast({ message: 'Đã khôi phục công việc' }),
    onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
    onSettled: refresh,
  });

  return useMutation({
    mutationFn: archiveTask,
    onMutate: async (taskId: string) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<BoardData>(boardKey);
      if (previous) {
        const tasks = previous.tasks.filter((task) => task.id !== taskId);
        queryClient.setQueryData(boardKey, { ...previous, tasks });
      }
      return { previous };
    },
    onError: (error, _taskId, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      toast({ tone: 'error', message: errorMessage(error) });
    },
    onSuccess: (_result, taskId) =>
      toast({
        message: 'Đã xoá công việc',
        action: { label: 'Hoàn tác', onClick: () => restore.mutate(taskId) },
      }),
    onSettled: refresh,
  });
}
