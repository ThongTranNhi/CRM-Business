import type { MyTaskParams } from '../types';

export const myTaskKeys = {
  all: ['my-tasks'] as const,
  /** Mọi trang danh sách (khác query số đếm của badge — dữ liệu khác dạng). */
  lists: () => [...myTaskKeys.all, 'list'] as const,
  list: (params: MyTaskParams) => [...myTaskKeys.lists(), params] as const,
  counts: () => [...myTaskKeys.all, 'counts'] as const,
};
