import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { moveTask, taskKeys } from '@/features/tasks';
import type { MyTask } from '../types';
import { myTaskKeys } from './useMyTasks';

type MyTaskPage = { data: MyTask[] };

/** Đánh dấu một dòng trong mọi trang Việc của tôi đang có trong cache. */
const markRow = (page: MyTaskPage | undefined, taskId: string, changes: Partial<MyTask>) =>
  page && {
    ...page,
    data: page.data.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
  };

/**
 * Checkbox hoàn thành nhanh: chuyển task sang cột mặc định nhóm "done" (cùng API kéo thả — server ghi
 * completed_at, completed_by, activity). Toast có [Hoàn tác] 5 giây: trả task về cột cũ.
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const refresh = () =>
    Promise.all(
      [myTaskKeys.all, taskKeys.boards(), taskKeys.details()].map((queryKey) =>
        queryClient.invalidateQueries({ queryKey }),
      ),
    );

  const undo = useMutation({
    mutationFn: (task: MyTask) =>
      moveTask({
        taskId: task.id,
        toColumnId: task.columnId,
        previousTaskId: null,
        nextTaskId: null,
      }),
    onSuccess: () => toast({ message: 'Đã hoàn tác' }),
    onError: () =>
      toast({ tone: 'error', message: 'Không thể hoàn tác, hãy mở board để chuyển lại' }),
    onSettled: refresh,
  });

  return useMutation({
    mutationFn: (task: MyTask & { doneColumnId: string }) =>
      moveTask({
        taskId: task.id,
        toColumnId: task.doneColumnId,
        previousTaskId: null,
        nextTaskId: null,
      }),
    onMutate: async (task) => {
      await queryClient.cancelQueries({ queryKey: myTaskKeys.all });
      queryClient.setQueriesData<MyTaskPage>({ queryKey: myTaskKeys.all }, (page) =>
        markRow(page, task.id, { status: 'done' }),
      );
    },
    onError: () => toast({ tone: 'error', message: 'Không thể hoàn thành công việc' }),
    onSuccess: (_result, task) =>
      toast({
        message: `Đã hoàn thành: ${task.title}`,
        action: { label: 'Hoàn tác', onClick: () => undo.mutate(task) },
      }),
    onSettled: refresh,
  });
}
