import { apiPageWithMeta, apiRequest, withQuery } from '@/lib/api-client';
import type { NotificationItem, NotificationsMeta } from '../types';

export const listNotifications = (params: { unread: boolean; page: number; pageSize: number }) =>
  apiPageWithMeta<NotificationItem, NotificationsMeta>(
    withQuery('/api/notifications', {
      unread: params.unread ? 'true' : undefined,
      page: params.page,
      pageSize: params.pageSize,
    }),
  );

/** Không truyền `ids` → đánh dấu tất cả đã đọc. */
export const markNotificationsRead = (ids?: string[]) =>
  apiRequest<{ updated: number }>('/api/notifications/read', {
    method: 'POST',
    body: JSON.stringify(ids ? { ids } : {}),
  });
