import { useInfiniteQuery, useMutation, type QueryKey } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { errorMessage, type PageResult } from '@/lib/api-client';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { addComment, getActivities, getComments } from '../api/task-detail.api';
import { taskKeys } from './task-keys';

/** Trang tiếp theo khi còn bản ghi chưa tải ("Xem bình luận cũ hơn", "Xem thêm"). */
const nextPage = ({ meta }: PageResult<unknown>) =>
  meta.page * meta.pageSize < meta.total ? meta.page + 1 : undefined;

/** Bình luận gốc mới nhất trước, mỗi trang 20; giao diện đảo lại để mới nhất nằm dưới cùng. */
export function useComments(taskId: string) {
  return useInfiniteQuery({
    queryKey: taskKeys.comments(taskId),
    queryFn: ({ pageParam }) => getComments(taskId, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

/** Lịch sử hoạt động mới nhất trước (activity-log.md), "Xem thêm" tải trang sau. */
export function useActivities(taskId: string) {
  return useInfiniteQuery({
    queryKey: taskKeys.activities(taskId),
    queryFn: ({ pageParam }) => getActivities(taskId, pageParam),
    initialPageParam: 1,
    getNextPageParam: nextPage,
  });
}

/** Gửi bình luận / trả lời; tải lại bình luận và số bình luận trên thẻ board. */
export function useAddComment(taskId: string, relatedKeys: readonly QueryKey[]) {
  const toast = useToast();
  const refresh = useInvalidateQueries([
    taskKeys.comments(taskId),
    taskKeys.boards(),
    ...relatedKeys,
  ]);
  return useMutation({
    mutationFn: ({ body, parentId }: { body: string; parentId: string | null }) =>
      addComment(taskId, body, parentId),
    onSuccess: refresh,
    onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
  });
}
