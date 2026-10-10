import type { IconName } from '@/components/ui';
import { addDays, formatDayMonth, todayInVietnam } from '@/lib/format-date';
import type { NotificationItem, NotificationType } from './types';

export const NOTIFICATION_ICONS: Record<NotificationType, IconName> = {
  task_assigned: 'checkSquare',
  task_collaborator_added: 'users',
  comment_mention: 'message',
  task_due_soon: 'clock',
  task_overdue: 'alert',
};

/** Câu hiển thị; người thao tác đứng đầu (thông báo hệ thống thì không có). */
export function notificationText({ type, actor, task }: NotificationItem): string {
  const who = actor?.fullName || 'Ai đó';
  const title = `“${task.title}”`;
  const due = task.dueDate ? ` (${formatDayMonth(task.dueDate)})` : '';
  switch (type) {
    case 'task_assigned':
      return `${who} giao cho bạn việc ${title}`;
    case 'task_collaborator_added':
      return `${who} thêm bạn làm người phối hợp việc ${title}`;
    case 'comment_mention':
      return `${who} nhắc đến bạn trong bình luận việc ${title}`;
    case 'task_due_soon':
      return `Việc ${title} đến hạn ngày mai${due}`;
    case 'task_overdue':
      return `Việc ${title} đã quá hạn${due}`;
  }
}

/** Đường dẫn mở task trong board (drawer `?task=`). */
export const notificationLink = ({ dashboardId, task }: NotificationItem) =>
  `/app/workspace/${dashboardId}?task=${task.id}`;

/** Ngày (giờ Việt Nam) của một thời điểm, dạng YYYY-MM-DD. */
const dayOf = (iso: string) => todayInVietnam(new Date(iso));

/** Nhóm theo ngày, giữ thứ tự mới nhất trước: "Hôm nay", "Hôm qua", "dd/MM". */
export function groupByDay(
  items: NotificationItem[],
  now: Date = new Date(),
): { label: string; items: NotificationItem[] }[] {
  const today = todayInVietnam(now);
  const yesterday = addDays(today, -1);
  const groups: { day: string; label: string; items: NotificationItem[] }[] = [];
  for (const item of items) {
    const day = dayOf(item.createdAt);
    let group = groups.find((existing) => existing.day === day);
    if (!group) {
      const label = day === today ? 'Hôm nay' : day === yesterday ? 'Hôm qua' : formatDayMonth(day);
      group = { day, label, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups.map(({ label, items: groupItems }) => ({ label, items: groupItems }));
}
