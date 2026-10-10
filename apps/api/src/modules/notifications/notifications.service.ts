import type { Env } from '../../config/env';
import { toPage, type Page, type Pagination } from '../../lib/pagination';
import type { RequestScope } from '../../lib/request-scope';
import * as notificationsRepository from './notifications.repository';
import type { ListNotificationsQuery, NotificationItem } from './notifications.types';

// Thông báo (frontend-spec 3.2, 4.21): mỗi người chỉ đọc / đánh dấu thông báo của chính mình — lọc theo
// người đăng nhập ở repository và trong RPC, không nhận id người nhận từ request.

/** `meta.unreadCount`: chấm trên chuông (như `meta.counts` của /api/tasks/mine). */
export interface NotificationPage {
  data: NotificationItem[];
  meta: Page<NotificationItem>['meta'] & { unreadCount: number };
}

export async function listNotifications(
  { env, actor }: RequestScope,
  query: ListNotificationsQuery,
): Promise<NotificationPage> {
  const [{ items, total }, unreadCount] = await Promise.all([
    notificationsRepository.listNotifications(env, actor.id, query),
    notificationsRepository.countUnread(env, actor.id),
  ]);
  const pagination: Pagination = { page: query.page, pageSize: query.pageSize };
  const page = toPage(items, total, pagination);
  return { data: page.data, meta: { ...page.meta, unreadCount } };
}

export async function markRead({ env, actor }: RequestScope, ids: string[] | undefined) {
  const updated = await notificationsRepository.markRead(env, actor.id, ids ?? null);
  return { updated };
}

/** Cron Trigger (wrangler.toml): chạy mỗi sáng, không có người dùng. */
export const generateDueNotifications = (env: Env) =>
  notificationsRepository.generateDueNotifications(env);
