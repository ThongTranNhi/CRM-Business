import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { listMyTasks } from '../api/my-tasks.api';
import type { MyTaskParams } from '../types';
import { myTaskKeys } from './my-task-keys';

export function useMyTasks(params: MyTaskParams) {
  return useQuery({
    queryKey: myTaskKeys.list(params),
    queryFn: () => listMyTasks(params),
    placeholderData: keepPreviousData,
  });
}
