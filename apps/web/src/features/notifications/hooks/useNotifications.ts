import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { listNotifications, markNotificationsRead } from '../api/notifications.api';
import { notificationKeys } from './notification-keys';

export const NOTIFICATION_PAGE_SIZE = 20;
const BELL_SIZE = 10;

/** Chuông: tải lại mỗi phút và khi quay lại tab (không dùng Realtime — đã chốt Đợt 3 S3). */
export function useLatestNotifications() {
  return useQuery({
    queryKey: notificationKeys.latest(),
    queryFn: () => listNotifications({ unread: false, page: 1, pageSize: BELL_SIZE }),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
}

export function useNotifications(params: { unread: boolean; page: number }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () => listNotifications({ ...params, pageSize: NOTIFICATION_PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
}

/** ids undefined → tất cả. Xong thì làm mới cả chuông lẫn trang Thông báo. */
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(ids),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
    onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
  });
}
