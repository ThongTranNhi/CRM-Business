import type { PageMeta } from '@/lib/api-client';

// GET /api/notifications (docs/api/endpoints/notifications.md).

export type NotificationType =
  | 'task_assigned'
  | 'task_collaborator_added'
  | 'comment_mention'
  | 'task_due_soon'
  | 'task_overdue';

export interface NotificationItem {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  task: { id: string; title: string; dueDate: string | null; isArchived: boolean };
  dashboardId: string;
  /** null: thông báo hệ thống (sắp đến hạn / quá hạn). */
  actor: { fullName: string } | null;
  commentExcerpt: string | null;
}

export interface NotificationsMeta extends PageMeta {
  unreadCount: number;
}

export const NOTIFICATION_FILTERS = ['all', 'unread'] as const;
export type NotificationFilter = (typeof NOTIFICATION_FILTERS)[number];
