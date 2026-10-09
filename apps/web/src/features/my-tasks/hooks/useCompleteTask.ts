import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { dashboardKeys } from '@/features/department-dashboards/cache-keys';
import { projectKeys } from '@/features/projects/project-options';
import { moveTask, taskKeys, type MovedTask } from '@/features/tasks';
import type { MyTask } from '../types';
import { myTaskKeys } from './my-task-keys';

type MyTaskPage = { data: MyTask[] };
type CompletableTask = MyTask & { doneColumnId: string };

/** Đánh dấu một dòng trong mọi trang Việc của tôi đang có trong cache. */
const markRow = (page: MyTaskPage | undefined, taskId: string, changes: Partial<MyTask>) =>
  page && {
    ...page,
    data: page.data.map((task) => (task.id === taskId ? { ...task, ...changes } : task)),
  };

/** Việc của tôi, board, drawer, số liệu thẻ Workspace, tiến độ dự án đều đổi theo. */
const AFFECTED_KEYS = [
  myTaskKeys.all,
  taskKeys.boards(),
  taskKeys.details(),
  dashboardKeys.all,
  projectKeys.all,
];

/**
 * Checkbox hoàn thành nhanh: chuyển task sang cột mặc định nhóm "done" (cùng API kéo thả — server ghi
 * completed_at, completed_by, activity). Toast có [Hoàn tác] 5 giây: trả task về ĐÚNG chỗ cũ (`from` do
 * server đọc trước khi chuyển: cột + task kề trên / dưới).
 */
export function useCompleteTask() {
  const queryClient = useQueryClient();
  const toast = useToast();
  const refresh = () =>
    Promise.all(AFFECTED_KEYS.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const undo = useMutation({
    mutationFn: ({ task, moved }: { task: MyTask; moved: MovedTask }) =>
      moveTask({
        taskId: task.id,
        toColumnId: moved.from?.columnId ?? task.columnId,
        previousTaskId: moved.from?.previousTaskId ?? null,
        nextTaskId: moved.from?.nextTaskId ?? null,
      }),
    onSuccess: () => toast({ message: 'Đã hoàn tác' }),
    onError: () =>
      toast({ tone: 'error', message: 'Không thể hoàn tác, hãy mở board để chuyển lại' }),
    onSettled: refresh,
  });

  return useMutation({
    mutationFn: (task: CompletableTask) =>
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
    onSuccess: (moved, task) =>
      toast({
        message: `Đã hoàn thành: ${task.title}`,
        action: { label: 'Hoàn tác', onClick: () => undo.mutate({ task, moved }) },
      }),
    onSettled: refresh,
  });
}
