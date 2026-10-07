import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { moveTask } from '../api/tasks.api';
import { applyMove } from '../task.utils';
import type { BoardData, BoardTask, TaskMove } from '../types';
import { taskKeys } from './task-keys';

const MOVE_KEY = [...taskKeys.all, 'move'] as const;

/** Câu toast sau khi kéo thả thành công (drag-and-drop.md). */
function successMessage(board: BoardData, move: TaskMove): string {
  const column = board.columns.find((candidate) => candidate.id === move.toColumnId);
  const task = board.tasks.find((candidate) => candidate.id === move.taskId);
  if (column?.status === 'done') return `Đã hoàn thành: ${task?.title ?? ''}`;
  return `Đã chuyển sang ${column?.name.toLocaleLowerCase('vi-VN') ?? 'cột mới'}`;
}

/** Trả riêng thẻ này về trạng thái trước khi kéo; thẻ khác (đang kéo song song) giữ nguyên. */
const revertTask = (board: BoardData, before: BoardTask): BoardData => ({
  ...board,
  tasks: board.tasks.map((task) => (task.id === before.id ? before : task)),
});

interface UseMoveTaskOptions {
  /** Query key của board đang hiển thị (đúng doneLimit). */
  boardKey: QueryKey;
  /** Query khác cần làm mới sau khi kéo (vd. số liệu thẻ Workspace). */
  relatedKeys: readonly QueryKey[];
}

/**
 * Kéo thả: cập nhật cache ngay (optimistic) → PATCH /move → lỗi thì chỉ trả thẻ đó về chỗ cũ + toast.
 * Kéo nhiều thẻ liên tiếp: chỉ tải lại board khi lượt kéo cuối cùng xong, để không ghi đè thẻ khác.
 */
export function useMoveTask({ boardKey, relatedKeys }: UseMoveTaskOptions) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationKey: MOVE_KEY,
    mutationFn: moveTask,
    onMutate: async (move: TaskMove) => {
      await queryClient.cancelQueries({ queryKey: boardKey });
      const board = queryClient.getQueryData<BoardData>(boardKey);
      const before = board?.tasks.find((task) => task.id === move.taskId);
      if (board) {
        queryClient.setQueryData(boardKey, applyMove(board, move, new Date().toISOString()));
      }
      return { board, before };
    },
    onError: (_error, _move, context) => {
      const current = queryClient.getQueryData<BoardData>(boardKey);
      if (current && context?.before) {
        queryClient.setQueryData(boardKey, revertTask(current, context.before));
      }
      toast({ tone: 'error', message: 'Không thể di chuyển công việc' });
    },
    onSuccess: (_result, move, context) => {
      if (context.board) toast({ message: successMessage(context.board, move) });
    },
    onSettled: () => {
      // Lượt kéo này vẫn được tính trong isMutating: === 1 nghĩa là không còn lượt nào khác.
      if (queryClient.isMutating({ mutationKey: MOVE_KEY }) > 1) return;
      return Promise.all(
        [taskKeys.boards(), ...relatedKeys].map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      );
    },
  });
}
