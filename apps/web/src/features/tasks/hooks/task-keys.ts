import type { TrashParams } from '../types';

export const taskKeys = {
  all: ['tasks'] as const,
  boards: () => [...taskKeys.all, 'board'] as const,
  board: (boardId: string, doneLimit: number) =>
    [...taskKeys.boards(), boardId, doneLimit] as const,
  trashes: () => [...taskKeys.all, 'trash'] as const,
  trash: (boardId: string, params: TrashParams) =>
    [...taskKeys.trashes(), boardId, params.page, params.q] as const,
  /** Mọi dữ liệu drawer của các task (chi tiết, checklist, bình luận, lịch sử). */
  details: () => [...taskKeys.all, 'task'] as const,
  task: (taskId: string) => [...taskKeys.details(), taskId] as const,
  detail: (taskId: string) => [...taskKeys.task(taskId), 'detail'] as const,
  checklist: (taskId: string) => [...taskKeys.task(taskId), 'checklist'] as const,
  comments: (taskId: string) => [...taskKeys.task(taskId), 'comments'] as const,
  activities: (taskId: string) => [...taskKeys.task(taskId), 'activities'] as const,
};
