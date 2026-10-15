export const NOTIFICATION_TYPES = [
  'task_assigned',
  'task_collaborator_added',
  'comment_mention',
  'task_due_soon',
  'task_overdue',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** Một dòng thông báo (view notification_feed). Câu chữ tiếng Việt do giao diện ghép theo `type`. */
export interface NotificationItem {
  id: string;
  type: NotificationType;
  createdAt: string;
  readAt: string | null;
  task: { id: string; title: string; dueDate: string | null; isArchived: boolean };
  /** Mở task: /app/workspace/:dashboardId?task=:id. */
  dashboardId: string;
  /** null: thông báo hệ thống (sắp đến hạn / quá hạn). */
  actor: { fullName: string } | null;
  /** Đoạn đầu bình luận khi được nhắc tên. */
  commentExcerpt: string | null;
}

export interface ListNotificationsQuery {
  page: number;
  pageSize: number;
  unread: boolean;
}
