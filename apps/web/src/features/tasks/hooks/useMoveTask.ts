import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { moveTask } from '../api/tasks.api';
import { applyMove } from '../task.utils';
import type { BoardData, TaskMove } from '../types';
import { taskKeys } from './task-keys';

/** Câu toast sau khi kéo thả thành công (drag-and-drop.md). */
function successMessage(board: BoardData, move: TaskMove): string {
  const column = board.columns.find((candidate) => candidate.id === move.toColumnId);
  const task = board.tasks.find((candidate) => candidate.id === move.taskId);
  if (column?.status === 'done') return `Đã hoàn thành: ${task?.title ?? ''}`;
  return `Đã chuyển sang ${column?.name.toLocaleLowerCase('vi-VN') ?? 'cột mới'}`;
}

interface UseMoveTaskOptions {
  /** Query key của board đang hiển thị (đúng doneLimit). */
  boardKey: QueryKey;
  /** Query khác cần làm mới sau khi kéo (vd. số liệu thẻ Workspace). */
  relatedKeys: readonly QueryKey[];
}

/**
 * Kéo thả: cập nhật cache ngay (optimistic) → PATCH /move → lỗi thì trả thẻ về chỗ cũ + toast.
 * Xong luôn tải lại board để có position thật từ backend.
 */
export function useMoveTask({ boardKey, relatedKeys }: UseMoveTaskOptions) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: moveTask,
    onMutate: async (move: TaskMove) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const previous = queryClient.getQueryData<BoardData>(boardKey);
      if (previous) {
        queryClient.setQueryData(boardKey, applyMove(previous, move, new Date().toISOString()));
      }
      return { previous };
    },
    onError: (_error, _move, context) => {
      if (context?.previous) queryClient.setQueryData(boardKey, context.previous);
      toast({ tone: 'error', message: 'Không thể di chuyển công việc' });
    },
    onSuccess: (_result, move, context) => {
      if (context.previous) toast({ message: successMessage(context.previous, move) });
    },
    onSettled: () =>
      Promise.all(
        [taskKeys.boards(), ...relatedKeys].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
