import type { TrashParams } from '../types';

export const taskKeys = {
  all: ['tasks'] as const,
  boards: () => [...taskKeys.all, 'board'] as const,
  board: (boardId: string, doneLimit: number) =>
    [...taskKeys.boards(), boardId, doneLimit] as const,
  trashes: () => [...taskKeys.all, 'trash'] as const,
  trash: (boardId: string, params: TrashParams) =>
    [...taskKeys.trashes(), boardId, params.page, params.q] as const,
};
