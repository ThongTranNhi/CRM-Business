import { useQuery } from '@tanstack/react-query';
import { getTrash } from '../api/tasks.api';
import type { TrashParams } from '../types';
import { taskKeys } from './task-keys';

/** Thùng rác của board; đổi trang / từ khoá thì giữ danh sách cũ tới khi có dữ liệu mới. */
export function useTaskTrash(boardId: string, params: TrashParams) {
  return useQuery({
    queryKey: taskKeys.trash(boardId, params),
    queryFn: () => getTrash(boardId, params),
    placeholderData: (previous) => previous,
  });
}
