import type { MyTaskParams } from '../types';

export const myTaskKeys = {
  all: ['my-tasks'] as const,
  list: (params: MyTaskParams) => [...myTaskKeys.all, 'list', params] as const,
  counts: () => [...myTaskKeys.all, 'counts'] as const,
};
