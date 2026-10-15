import { Button, Skeleton, Timeline } from '@/components/ui';
import { formatDateTime } from '@/lib/format-date';
import { activityText } from '../activity-text';
import { useActivities } from '../hooks/useTaskFeeds';
import { uniqueById } from '../task-detail.utils';
import { DrawerSection, SectionError } from './DrawerSection';

/** Lịch sử hoạt động (activity-log.md): mới nhất ở trên, "Xem thêm" tải trang cũ hơn. */
export function TaskActivitySection({ taskId }: { taskId: string }) {
  const activities = useActivities(taskId);
  const items = uniqueById(activities.data?.pages ?? []);

  function renderBody() {
    if (activities.isPending) return <Skeleton className="h-24 w-full" />;
    if (activities.isError) return <SectionError onRetry={() => void activities.refetch()} />;
    if (items.length === 0) return <p className="text-sm text-gray-500">Chưa có hoạt động nào.</p>;
    return (
      <>
        <Timeline
          label="Lịch sử hoạt động"
          items={items.map((activity) => ({
            id: activity.id,
            time: formatDateTime(new Date(activity.createdAt)),
            content: activityText(activity),
          }))}
        />
        {activities.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            loading={activities.isFetchingNextPage}
            onClick={() => void activities.fetchNextPage()}
          >
            Xem thêm
          </Button>
        )}
      </>
    );
  }

  return <DrawerSection title="Lịch sử hoạt động">{renderBody()}</DrawerSection>;
}
