import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelativeTime } from '@/lib/format-date';
import { useMarkNotificationsRead } from '../hooks/useNotifications';
import { NOTIFICATION_ICONS, notificationLink, notificationText } from '../notifications.utils';
import type { NotificationItem } from '../types';

interface NotificationRowProps {
  notification: NotificationItem;
  /** Chuông: đóng dropdown sau khi bấm. */
  onOpen?: () => void;
}

/** Một thông báo: bấm → đánh dấu đã đọc + mở task trên board (drawer `?task=`). */
export function NotificationRow({ notification, onOpen }: NotificationRowProps) {
  const navigate = useNavigate();
  const markRead = useMarkNotificationsRead();
  const isUnread = notification.readAt === null;
  const createdAt = new Date(notification.createdAt);

  function open() {
    if (isUnread) markRead.mutate([notification.id]);
    onOpen?.();
    navigate(notificationLink(notification));
  }

  return (
    <button
      type="button"
      onClick={open}
      className={cn(
        'flex w-full gap-3 px-4 py-3 text-left hover:bg-gray-50 focus-visible:bg-gray-50 focus-visible:outline-none',
        isUnread && 'bg-primary-50',
      )}
    >
      <Icon
        name={NOTIFICATION_ICONS[notification.type]}
        size={18}
        className="mt-0.5 shrink-0 text-gray-500"
      />
      <span className="min-w-0 flex-1 space-y-0.5">
        <span
          className={cn('block text-sm text-gray-800', isUnread && 'font-medium text-gray-900')}
        >
          {notificationText(notification)}
        </span>
        {notification.commentExcerpt && (
          <span className="block truncate text-xs text-gray-500">
            {notification.commentExcerpt}
          </span>
        )}
        <time
          dateTime={notification.createdAt}
          title={formatDateTime(createdAt)}
          className="block text-xs text-gray-500"
        >
          {formatRelativeTime(createdAt)}
        </time>
      </span>
      {isUnread && (
        <span
          aria-label="Chưa đọc"
          className="mt-1.5 size-2 shrink-0 rounded-full bg-primary-600"
        />
      )}
    </button>
  );
}
