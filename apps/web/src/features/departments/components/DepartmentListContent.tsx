import { Button, Card, EmptyState, ErrorState, Pagination, Skeleton } from '@/components/ui';
import { useDepartments } from '../hooks/useDepartments';
import type { DepartmentListParams } from '../types';
import { DeletedDepartmentTable } from './DeletedDepartmentTable';
import { DepartmentTable } from './DepartmentTable';

interface DepartmentListContentProps {
  params: DepartmentListParams;
  onPageChange: (page: number) => void;
  /** Không truyền: người xem không có quyền tạo phòng ban. */
  onCreate?: () => void;
}

export function DepartmentListContent({
  params,
  onPageChange,
  onCreate,
}: DepartmentListContentProps) {
  const { data, isPending, isError, error, refetch } = useDepartments(params);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (data.data.length === 0) return <EmptyList params={params} onCreate={onCreate} />;
  return (
    <>
      {params.status === 'deleted' ? (
        <DeletedDepartmentTable departments={data.data} />
      ) : (
        <DepartmentTable departments={data.data} />
      )}
      <Pagination {...data.meta} onChange={onPageChange} />
    </>
  );
}

interface EmptyListProps {
  params: DepartmentListParams;
  onCreate?: () => void;
}

function EmptyList({ params, onCreate }: EmptyListProps) {
  if (params.q) {
    return (
      <Card>
        <EmptyState icon="search" title="Không tìm thấy phòng ban phù hợp" />
      </Card>
    );
  }
  if (params.status === 'deleted') {
    return (
      <Card>
        <EmptyState icon="trash" title="Chưa có phòng ban nào bị xoá" />
      </Card>
    );
  }
  return (
    <Card>
      <EmptyState
        icon="building"
        title="Chưa có phòng ban"
        description={
          onCreate ? 'Tạo phòng ban đầu tiên để sắp xếp nhân viên.' : 'Liên hệ HR để tạo phòng ban.'
        }
        action={onCreate && <Button onClick={onCreate}>Tạo phòng ban</Button>}
      />
    </Card>
  );
}
