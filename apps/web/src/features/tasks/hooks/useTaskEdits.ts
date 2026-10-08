import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import type { PersonRef } from '@/features/departments';
import { errorMessage } from '@/lib/api-client';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { setCollaborators, updateTask } from '../api/task-detail.api';
import { cardFieldsOf, patchBoardTask } from '../task-detail.utils';
import type { BoardData, TaskDetail, UpdateTaskInput } from '../types';
import { taskKeys } from './task-keys';

interface TaskEditOptions {
  taskId: string;
  /** Board đang hiển thị: thẻ cập nhật ngay cùng drawer. */
  boardKey: QueryKey;
  relatedKeys: readonly QueryKey[];
}

/**
 * Sửa task trong drawer (optimistic): drawer và thẻ trên board đổi ngay; lỗi thì trả cả hai về như cũ
 * + toast. Xong thì lấy chi tiết từ server, tải lại lịch sử và board.
 */
function useTaskEdit<Variables>(
  { taskId, boardKey, relatedKeys }: TaskEditOptions,
  mutationFn: (variables: Variables) => Promise<TaskDetail>,
  preview: (detail: TaskDetail, variables: Variables) => TaskDetail,
) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const detailKey = taskKeys.detail(taskId);
  const refresh = useInvalidateQueries([
    taskKeys.activities(taskId),
    taskKeys.boards(),
    ...relatedKeys,
  ]);
  return useMutation({
    mutationFn,
    onMutate: async (variables: Variables) => {
      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: boardKey }),
      ]);
      const detail = queryClient.getQueryData<TaskDetail>(detailKey);
      const board = queryClient.getQueryData<BoardData>(boardKey);
      if (detail) {
        const next = preview(detail, variables);
        queryClient.setQueryData(detailKey, next);
        if (board)
          queryClient.setQueryData(boardKey, patchBoardTask(board, taskId, cardFieldsOf(next)));
      }
      return { detail, board };
    },
    onError: (error, _variables, context) => {
      if (context?.detail) queryClient.setQueryData(detailKey, context.detail);
      if (context?.board) queryClient.setQueryData(boardKey, context.board);
      toast({ tone: 'error', message: errorMessage(error) });
    },
    onSuccess: (detail) => queryClient.setQueryData(detailKey, detail),
    onSettled: refresh,
  });
}

/** `preview`: phần hiển thị ngay (vd. người phụ trách mới kèm tên) — chỉ `changes` gửi lên server. */
export interface TaskUpdate {
  changes: UpdateTaskInput;
  preview: Partial<TaskDetail>;
}

/** PATCH /api/tasks/:id từng trường (tên, người phụ trách, ưu tiên, ngày, mô tả). */
export function useUpdateTask(options: TaskEditOptions) {
  return useTaskEdit(
    options,
    ({ changes }: TaskUpdate) => updateTask(options.taskId, changes),
    (detail, { preview }) => ({ ...detail, ...preview }),
  );
}

/** PUT /api/tasks/:id/collaborators — thay cả danh sách người phối hợp. */
export function useSetCollaborators(options: TaskEditOptions) {
  return useTaskEdit(
    options,
    (people: PersonRef[]) =>
      setCollaborators(
        options.taskId,
        people.map((person) => person.id),
      ),
    (detail, people) => ({ ...detail, collaborators: people }),
  );
}

/** Mutation sửa task, truyền cho các trường con của drawer. */
export type TaskUpdater = ReturnType<typeof useUpdateTask>;
