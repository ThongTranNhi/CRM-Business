import { useMutation, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { restoreTask } from '../api/tasks.api';
import { taskKeys } from './task-keys';

/** Khôi phục việc đã xoá (toast [Hoàn tác] hoặc Thùng rác): task về cuối cột cũ, board và thùng rác tải lại. */
export function useRestoreTask(relatedKeys: readonly QueryKey[]) {
  const toast = useToast();
  const refresh = useInvalidateQueries([taskKeys.boards(), taskKeys.trashes(), ...relatedKeys]);
  return useMutation({
    mutationFn: restoreTask,
    onSuccess: () => toast({ message: 'Đã khôi phục công việc' }),
    onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
    onSettled: refresh,
  });
}
