import { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Icon, Skeleton } from '@/components/ui';
import { useDismiss } from '@/lib/use-dismiss';
import { useLatestNotifications, useMarkNotificationsRead } from '../hooks/useNotifications';
import { NotificationRow } from './NotificationRow';

/** Chuông ở Header (frontend-spec 3.2): chấm khi có chưa đọc, dropdown 10 thông báo mới nhất. */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);
  const latest = useLatestNotifications();
  const markAll = useMarkNotificationsRead();
  const unread = latest.data?.meta.unreadCount ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={unread > 0 ? `Thông báo, ${unread} chưa đọc` : 'Thông báo'}
        className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100"
      >
        <Icon name="bell" />
        {unread > 0 && (
          <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary-600 ring-2 ring-white" />
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thông báo mới"
          className="absolute right-0 mt-2 w-[min(24rem,calc(100vw-2rem))] rounded-card border border-gray-200 bg-white shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-2.5">
            <p className="text-sm font-semibold text-gray-900">Thông báo</p>
            {unread > 0 && (
              <Button
                variant="ghost"
                size="sm"
                loading={markAll.isPending}
                onClick={() => markAll.mutate(undefined)}
              >
                Đánh dấu tất cả đã đọc
              </Button>
            )}
          </div>
          <div className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
            <BellBody query={latest} onOpen={close} />
          </div>
          <Link
            to="/app/notifications"
            onClick={close}
            className="block border-t border-gray-100 px-4 py-2.5 text-center text-sm font-medium text-primary-700 hover:bg-gray-50"
          >
            Xem tất cả
          </Link>
        </div>
      )}
    </div>
  );
}

interface BellBodyProps {
  query: ReturnType<typeof useLatestNotifications>;
  onOpen: () => void;
}

function BellBody({ query, onOpen }: BellBodyProps) {
  if (query.isPending) return <Skeleton className="m-4 h-16" />;
  if (query.isError) {
    return <p className="px-4 py-6 text-center text-sm text-gray-500">Không tải được thông báo.</p>;
  }
  if (query.data.data.length === 0) {
    return (
      <p className="px-4 py-6 text-center text-sm text-gray-500">Bạn chưa có thông báo nào.</p>
    );
  }
  return query.data.data.map((notification) => (
    <NotificationRow key={notification.id} notification={notification} onOpen={onOpen} />
  ));
}
