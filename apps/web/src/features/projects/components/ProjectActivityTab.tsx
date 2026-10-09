import { Button, Card, EmptyState, ErrorState, Skeleton, Timeline } from '@/components/ui';
import { formatDateTime } from '@/lib/format-date';
import { useProjectActivities } from '../hooks/useProjects';
import { projectActivityText } from '../project-activity-text';

/** Tab Hoạt động: lịch sử dự án mới nhất ở trên, "Xem thêm" tải trang cũ hơn. */
export function ProjectActivityTab({ projectId }: { projectId: string }) {
  const activities = useProjectActivities(projectId);
  // Phân trang theo offset: có hoạt động mới thì trang sau lệch một dòng → bỏ dòng trùng id.
  const items = [
    ...new Map(
      (activities.data?.pages ?? [])
        .flatMap((page) => page.data)
        .map((activity) => [activity.id, activity]),
    ).values(),
  ];

  if (activities.isPending) return <Skeleton className="h-48 w-full" />;
  if (activities.isError) return <ErrorState onRetry={() => void activities.refetch()} />;
  if (items.length === 0) {
    return (
      <Card>
        <EmptyState icon="clock" title="Chưa có hoạt động nào" />
      </Card>
    );
  }
  return (
    <Card>
      <div className="space-y-4 p-4">
        <Timeline
          label="Lịch sử dự án"
          items={items.map((activity) => ({
            id: activity.id,
            time: formatDateTime(new Date(activity.createdAt)),
            content: projectActivityText(activity),
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
      </div>
    </Card>
  );
}
