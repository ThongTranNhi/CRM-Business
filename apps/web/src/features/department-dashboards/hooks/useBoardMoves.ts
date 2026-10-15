import type { QueryKey } from '@tanstack/react-query';
import { useMoveTask, type BoardData, type BoardTask } from '@/features/tasks';
import { columnTasks, dropNeighbors, isSamePlace } from '../board.utils';
import { BOARD_RELATED_KEYS } from './board-related-keys';

interface UseBoardMovesOptions {
  board: BoardData;
  /** Thẻ đang hiện sau khi lọc (chỗ thả tính theo những thẻ này). */
  visibleTasks: BoardTask[];
  boardKey: QueryKey;
}

/** Nối kéo thả và menu "Chuyển sang cột…" với PATCH /move (optimistic trong useMoveTask). */
export function useBoardMoves({ board, visibleTasks, boardKey }: UseBoardMovesOptions) {
  const move = useMoveTask({ boardKey, relatedKeys: BOARD_RELATED_KEYS });

  /**
   * `index` null: cuối cột (menu "Chuyển sang cột…") — không gửi task lân cận, server tự đặt sau thẻ
   * cuối thật (cột Đã hoàn thành chỉ tải N thẻ mới nhất nên "thẻ cuối" phía client có thể sai).
   */
  function moveTo(taskId: string, columnId: string, index: number | null) {
    const others = (tasks: BoardTask[]) =>
      columnTasks(tasks, columnId).filter((task) => task.id !== taskId);
    const neighbors =
      index === null
        ? { previousTaskId: null, nextTaskId: null }
        : dropNeighbors(others(board.tasks), others(visibleTasks), index);
    const next = { taskId, toColumnId: columnId, ...neighbors };
    if (!isSamePlace(board.tasks, next)) move.mutate(next);
  }

  return {
    dropAt: ({ taskId, columnId, index }: { taskId: string; columnId: string; index: number }) =>
      moveTo(taskId, columnId, index),
    moveToEnd: (taskId: string, columnId: string) => moveTo(taskId, columnId, null),
  };
}
