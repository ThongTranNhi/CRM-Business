import type { UseQueryResult } from '@tanstack/react-query';
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
} from '@/components/ui';
import { todayInVietnam } from '@/lib/format-date';
import { useCompleteTask } from '../hooks/useCompleteTask';
import { groupByStatus, STATUS_GROUP_LABEL, TAB_LABEL } from '../my-tasks.utils';
import type { MyTask, MyTaskTab, MyTasksMeta } from '../types';
import { MyTaskRow } from './MyTaskRow';

interface MyTasksContentProps {
  query: UseQueryResult<{ data: MyTask[]; meta: MyTasksMeta }>;
  tab: MyTaskTab;
  isFiltering: boolean;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

/** Danh sách một tab với đủ 4 trạng thái: đang tải, lỗi, trống (có / không lọc), có dữ liệu. */
export function MyTasksContent({ query, tab, isFiltering, ...props }: MyTasksContentProps) {
  const complete = useCompleteTask();
  const { data, isPending, isError, error, refetch } = query;

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (data.data.length === 0) {
    return (
      <Card>
        {isFiltering ? (
          <EmptyState
            icon="search"
            title="Không có việc phù hợp"
            action={
              <Button variant="secondary" onClick={props.onClearFilters}>
                Xoá lọc
              </Button>
            }
          />
        ) : data.meta.counts.open + data.meta.counts.done === 0 ? (
          <EmptyState
            icon="checkSquare"
            title="Bạn không có việc nào"
            description="Việc bạn phụ trách hoặc phối hợp trên các Dashboard sẽ hiện ở đây."
            action={<ButtonLink to="/app/workspace">Vào Workspace</ButtonLink>}
          />
        ) : (
          <EmptyState icon="checkSquare" title={`Không có việc ở mục "${TAB_LABEL[tab]}"`} />
        )}
      </Card>
    );
  }
  const today = todayInVietnam();
  return (
    <>
      <Card className="overflow-hidden">
        {groupByStatus(data.data).map((group) => (
          <section key={group.status} aria-label={STATUS_GROUP_LABEL[group.status]}>
            <h2 className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {STATUS_GROUP_LABEL[group.status]}
            </h2>
            <ul className="divide-y divide-gray-100">
              {group.tasks.map((task) => (
                <MyTaskRow
                  key={task.id}
                  task={task}
                  today={today}
                  onComplete={(target) => complete.mutate(target)}
                />
              ))}
            </ul>
          </section>
        ))}
      </Card>
      <Pagination {...data.meta} onChange={props.onPageChange} />
    </>
  );
}
