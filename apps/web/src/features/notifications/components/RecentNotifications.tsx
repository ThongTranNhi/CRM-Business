import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useLatestNotifications } from '../hooks/useNotifications';
import { NotificationRow } from './NotificationRow';

const RECENT_COUNT = 5;

/**
 * Khối "Thông báo mới" ở Tổng quan cá nhân (frontend-spec 4.2): 5 dòng mới nhất. Dùng chung query với chuông Header
 * nên không gọi thêm API; bấm dòng → đối tượng gốc như ở chuông.
 */
export function RecentNotifications() {
  const latest = useLatestNotifications();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Thông báo mới</h2>
        <Link
          to="/app/notifications"
          className="text-sm font-medium text-primary-700 hover:underline"
        >
          Xem tất cả
        </Link>
      </div>
      <RecentBody query={latest} />
    </Card>
  );
}

interface RecentBodyProps {
  query: ReturnType<typeof useLatestNotifications>;
}

function RecentBody({ query }: RecentBodyProps) {
  if (query.isPending) return <Skeleton className="m-4 h-24" />;
  if (query.isError) {
    return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
  }
  const items = query.data.data.slice(0, RECENT_COUNT);
  if (items.length === 0) {
    return <EmptyState icon="bell" title="Chưa có thông báo" />;
  }
  return (
    <div className="divide-y divide-gray-100">
      {items.map((notification) => (
        <NotificationRow key={notification.id} notification={notification} />
      ))}
    </div>
  );
}
