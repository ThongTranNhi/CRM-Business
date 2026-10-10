import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Pagination,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { readOption, readPage, useUrlParams } from '@/lib/use-url-params';
import { NotificationRow } from '../components/NotificationRow';
import { useMarkNotificationsRead, useNotifications } from '../hooks/useNotifications';
import { groupByDay } from '../notifications.utils';
import { NOTIFICATION_FILTERS, type NotificationFilter } from '../types';

const FILTER_LABELS: Record<NotificationFilter, string> = { all: 'Tất cả', unread: 'Chưa đọc' };

/** /app/notifications (frontend-spec 4.21): theo ngày, lọc Tất cả / Chưa đọc trên URL (`?filter=`). */
export function NotificationsPage() {
  const [params, updateParams] = useUrlParams();
  const filter = readOption(params, 'filter', NOTIFICATION_FILTERS);
  const query = useNotifications({ unread: filter === 'unread', page: readPage(params) });
  const markAll = useMarkNotificationsRead();
  const unread = query.data?.meta.unreadCount ?? 0;
  const tabLabel = (value: NotificationFilter) =>
    value === 'unread' && unread > 0 ? `${FILTER_LABELS[value]} (${unread})` : FILTER_LABELS[value];

  function renderList() {
    if (query.isPending) return <Skeleton className="h-64 w-full" />;
    if (query.isError) {
      return <ErrorState message={query.error.message} onRetry={() => void query.refetch()} />;
    }
    if (query.data.data.length === 0) {
      return (
        <Card>
          <EmptyState
            icon="bell"
            title={
              filter === 'unread' ? 'Không còn thông báo chưa đọc' : 'Bạn chưa có thông báo nào'
            }
            description="Bạn sẽ nhận thông báo khi được giao việc, được nhắc tên, hoặc việc sắp đến hạn."
          />
        </Card>
      );
    }
    return (
      <>
        {groupByDay(query.data.data).map((group) => (
          <section key={group.label} className="mb-4">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {group.label}
            </h2>
            <Card className="divide-y divide-gray-100 overflow-hidden">
              {group.items.map((notification) => (
                <NotificationRow key={notification.id} notification={notification} />
              ))}
            </Card>
          </section>
        ))}
        <Pagination {...query.data.meta} onChange={(next) => updateParams({ page: next })} />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Thông báo"
        description="Việc được giao, được nhắc tên trong bình luận, việc sắp đến hạn và quá hạn."
        actions={
          unread > 0 && (
            <Button
              variant="secondary"
              loading={markAll.isPending}
              onClick={() => markAll.mutate(undefined)}
            >
              Đánh dấu tất cả đã đọc
            </Button>
          )
        }
      />
      <div className="mb-4">
        <Tabs
          label="Lọc thông báo"
          items={NOTIFICATION_FILTERS.map((value) => ({ value, label: tabLabel(value) }))}
          value={filter}
          onChange={(next) => updateParams({ filter: next === 'all' ? null : next, page: null })}
        />
      </div>
      {renderList()}
    </>
  );
}
