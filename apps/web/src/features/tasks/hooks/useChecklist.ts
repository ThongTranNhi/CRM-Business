import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import {
  addChecklistItem,
  getChecklist,
  removeChecklistItem,
  updateChecklistItem,
} from '../api/task-detail.api';
import {
  applyChecklistChange,
  checklistCounts,
  patchBoardTask,
  type ChecklistChange,
} from '../task-detail.utils';
import type { BoardData, ChecklistItem } from '../types';
import { taskKeys } from './task-keys';

export function useChecklist(taskId: string) {
  return useQuery({ queryKey: taskKeys.checklist(taskId), queryFn: () => getChecklist(taskId) });
}

function sendChange(taskId: string, change: ChecklistChange): Promise<ChecklistItem[]> {
  if (change.kind === 'add') return addChecklistItem(taskId, change.content);
  if (change.kind === 'remove') return removeChecklistItem(taskId, change.itemId);
  return updateChecklistItem(taskId, change.itemId, {
    content: change.content,
    isDone: change.isDone,
  });
}

/**
 * Thêm / sửa / tick / xoá mục checklist (BR-17): danh sách và số x/y trên thẻ board đổi ngay; lỗi thì
 * trả lại + toast. Tick nhanh nhiều mục: chỉ lấy danh sách server trả khi không còn thay đổi nào
 * khác đang gửi (nếu không, phản hồi của lần trước sẽ ghi đè lần tick sau), rồi tải lại một lần.
 */
export function useChecklistChange(taskId: string, boardKey: QueryKey) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const listKey = taskKeys.checklist(taskId);
  const mutationKey = [...taskKeys.checklist(taskId), 'change'];
  const refresh = useInvalidateQueries([listKey, taskKeys.activities(taskId), taskKeys.boards()]);
  // Trong onSuccess / onSettled, chính lần gửi này vẫn đang được đếm.
  const isLastChange = () => queryClient.isMutating({ mutationKey }) <= 1;
  const showCounts = (items: ChecklistItem[]) => {
    const board = queryClient.getQueryData<BoardData>(boardKey);
    if (board) {
      queryClient.setQueryData(
        boardKey,
        patchBoardTask(board, taskId, { checklist: checklistCounts(items) }),
      );
    }
  };
  return useMutation({
    mutationKey,
    mutationFn: (change: ChecklistChange) => sendChange(taskId, change),
    onMutate: async (change) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<ChecklistItem[]>(listKey);
      if (previous) {
        const next = applyChecklistChange(previous, change);
        queryClient.setQueryData(listKey, next);
        showCounts(next);
      }
      return { previous };
    },
    onError: (error, _change, context) => {
      // Còn lần gửi khác: bản cũ đã lỗi thời, để lần tải lại cuối cùng sửa danh sách.
      if (context?.previous && isLastChange()) {
        queryClient.setQueryData(listKey, context.previous);
        showCounts(context.previous);
      }
      toast({ tone: 'error', message: errorMessage(error) });
    },
    onSuccess: (items) => {
      if (!isLastChange()) return;
      queryClient.setQueryData(listKey, items);
      showCounts(items);
    },
    onSettled: async () => {
      if (isLastChange()) await refresh();
    },
  });
}
