import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { addTaskLink, getTaskLinks, removeTaskLink } from '../api/task-detail.api';
import { patchBoardTask } from '../task-detail.utils';
import type { BoardData, TaskLink } from '../types';
import { taskKeys } from './task-keys';

export function useTaskLinks(taskId: string) {
  return useQuery({ queryKey: taskKeys.links(taskId), queryFn: () => getTaskLinks(taskId) });
}

/** Sau khi thêm / xoá: thay danh sách bằng bản server trả, cập nhật số link trên thẻ board, tải lại lịch sử. */
function useApplyLinks(taskId: string, boardKey: QueryKey) {
  const queryClient = useQueryClient();
  const refresh = useInvalidateQueries([taskKeys.activities(taskId), taskKeys.boards()]);
  return async (links: TaskLink[]) => {
    queryClient.setQueryData(taskKeys.links(taskId), links);
    const board = queryClient.getQueryData<BoardData>(boardKey);
    if (board) {
      queryClient.setQueryData(
        boardKey,
        patchBoardTask(board, taskId, { linkCount: links.length }),
      );
    }
    await refresh();
  };
}

export function useAddTaskLink(taskId: string, boardKey: QueryKey) {
  const apply = useApplyLinks(taskId, boardKey);
  return useMutation({
    mutationFn: (link: { url: string; title: string | null }) => addTaskLink(taskId, link),
    onSuccess: apply,
  });
}

export function useRemoveTaskLink(taskId: string, boardKey: QueryKey) {
  const apply = useApplyLinks(taskId, boardKey);
  return useMutation({
    mutationFn: (linkId: string) => removeTaskLink(taskId, linkId),
    onSuccess: apply,
  });
}
