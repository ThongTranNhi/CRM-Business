import type { Env } from '../../config/env';
import { rangeParams } from '../../lib/pagination';
import { callRpc, supabaseList } from '../../lib/supabase';
import type {
  ListNotificationsQuery,
  NotificationItem,
  NotificationType,
} from './notifications.types';

interface FeedRow {
  id: string;
  type: NotificationType;
  created_at: string;
  read_at: string | null;
  task_id: string;
  task_title: string;
  task_due_date: string | null;
  task_archived: boolean;
  dashboard_id: string;
  actor_account_id: string | null;
  actor_name: string | null;
  comment_excerpt: string | null;
}

const FEED_SELECT =
  'id,type,created_at,read_at,task_id,task_title,task_due_date,task_archived,dashboard_id,' +
  'actor_account_id,actor_name,comment_excerpt';

const toItem = (row: FeedRow): NotificationItem => ({
  id: row.id,
  type: row.type,
  createdAt: row.created_at,
  readAt: row.read_at,
  task: {
    id: row.task_id,
    title: row.task_title,
    dueDate: row.task_due_date,
    isArchived: row.task_archived,
  },
  dashboardId: row.dashboard_id,
  actor: row.actor_account_id ? { fullName: row.actor_name ?? '' } : null,
  commentExcerpt: row.comment_excerpt,
});

/** Thông báo của một người (theo auth user id), mới nhất trước. */
export async function listNotifications(env: Env, userId: string, query: ListNotificationsQuery) {
  const params = new URLSearchParams({
    select: FEED_SELECT,
    recipient_user_id: `eq.${userId}`,
    order: 'created_at.desc,id',
    ...rangeParams(query),
  });
  if (query.unread) params.set('read_at', 'is.null');
  const { rows, total } = await supabaseList<FeedRow>(env, `/rest/v1/notification_feed?${params}`);
  return { items: rows.map(toItem), total };
}

/** Số thông báo chưa đọc (chấm trên chuông) — chỉ đếm, không lấy dòng. */
export async function countUnread(env: Env, userId: string): Promise<number> {
  const params = new URLSearchParams({
    select: 'id',
    recipient_user_id: `eq.${userId}`,
    read_at: 'is.null',
    limit: '1',
  });
  const { total } = await supabaseList<{ id: string }>(env, `/rest/v1/notification_feed?${params}`);
  return total;
}

/** ids null → tất cả thông báo chưa đọc của người gọi. Trả số dòng đã đổi. */
export const markRead = (env: Env, userId: string, ids: string[] | null) =>
  callRpc<number>(env, {
    name: 'crm_mark_notifications_read',
    args: { user_uuid: userId, notification_uuids: ids },
  });

/** Cron mỗi sáng: thông báo sắp đến hạn / quá hạn (migration 20261013090000). */
export const generateDueNotifications = (env: Env) =>
  callRpc<{ dueSoon: number; overdue: number }>(env, {
    name: 'crm_generate_due_notifications',
    args: {},
  });
