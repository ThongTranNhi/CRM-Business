export const taskKeys = {
  all: ['tasks'] as const,
  boards: () => [...taskKeys.all, 'board'] as const,
  board: (boardId: string, doneLimit: number) =>
    [...taskKeys.boards(), boardId, doneLimit] as const,
};
