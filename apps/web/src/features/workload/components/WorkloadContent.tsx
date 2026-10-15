import type { UseQueryResult } from '@tanstack/react-query';
import { Button, Card, EmptyState, ErrorState, Pagination, Skeleton } from '@/components/ui';
import type { PageResult } from '@/lib/api-client';
import type { WorkloadParams, WorkloadRow, WorkloadSort } from '../types';
import { WorkloadTable } from './WorkloadTable';

interface WorkloadContentProps {
  query: UseQueryResult<PageResult<WorkloadRow>>;
  params: WorkloadParams;
  canOpenProfile: boolean;
  onSort: (sort: WorkloadSort) => void;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
}

/** Bảng với đủ 4 trạng thái: đang tải, lỗi, trống (có / không lọc phòng), có dữ liệu. */
export function WorkloadContent({ query, params, ...props }: WorkloadContentProps) {
  const { data, isPending, isError, error, refetch } = query;

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (data.data.length === 0) {
    return (
      <Card>
        {params.departmentId ? (
          <EmptyState
            icon="search"
            title="Phòng ban này chưa có nhân viên"
            action={
              <Button variant="secondary" onClick={props.onClearFilters}>
                Xem mọi phòng ban
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="barChart"
            title="Chưa có nhân viên để thống kê"
            description="Khối lượng việc tính cho nhân viên trong phạm vi bạn được xem."
          />
        )}
      </Card>
    );
  }
  return (
    <>
      <WorkloadTable
        rows={data.data}
        sort={params}
        onSort={props.onSort}
        canOpenProfile={props.canOpenProfile}
      />
      <Pagination {...data.meta} onChange={props.onPageChange} />
    </>
  );
}
