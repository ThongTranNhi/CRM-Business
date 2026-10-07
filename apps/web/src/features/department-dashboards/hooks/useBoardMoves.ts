import type { QueryKey } from '@tanstack/react-query';
import { useMoveTask, type BoardData, type BoardTask } from '@/features/tasks';
import { columnTasks, dropNeighbors, isSamePlace } from '../board.utils';
import { dashboardKeys } from './dashboard-keys';

interface UseBoardMovesOptions {
  board: BoardData;
  /** Thẻ đang hiện sau khi lọc (chỗ thả tính theo những thẻ này). */
  visibleTasks: BoardTask[];
  boardKey: QueryKey;
}

/** Nối kéo thả và menu "Chuyển sang cột…" với PATCH /move (optimistic trong useMoveTask). */
export function useBoardMoves({ board, visibleTasks, boardKey }: UseBoardMovesOptions) {
  const move = useMoveTask({ boardKey, relatedKeys: [dashboardKeys.all] });

  /** `index` null: cuối cột (menu "Chuyển sang cột…"). */
  function moveTo(taskId: string, columnId: string, index: number | null) {
    const others = (tasks: BoardTask[]) =>
      columnTasks(tasks, columnId).filter((task) => task.id !== taskId);
    const full = others(board.tasks);
    const neighbors =
      index === null
        ? { previousTaskId: full[full.length - 1]?.id ?? null, nextTaskId: null }
        : dropNeighbors(full, others(visibleTasks), index);
    const next = { taskId, toColumnId: columnId, ...neighbors };
    if (!isSamePlace(board.tasks, next)) move.mutate(next);
  }

  return {
    dropAt: ({ taskId, columnId, index }: { taskId: string; columnId: string; index: number }) =>
      moveTo(taskId, columnId, index),
    moveToEnd: (taskId: string, columnId: string) => moveTo(taskId, columnId, null),
  };
}
