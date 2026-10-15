import { Button, Card, EmptyState, ErrorState, Pagination, Skeleton } from '@/components/ui';
import { useProjects } from '../hooks/useProjects';
import type { ProjectListParams } from '../types';
import { ProjectTable } from './ProjectTable';

interface ProjectListContentProps {
  params: ProjectListParams;
  onPageChange: (page: number) => void;
  onClearFilters: () => void;
  /** Không truyền: người xem không tạo được dự án. */
  onCreate?: () => void;
}

/** Danh sách dự án với đủ 4 trạng thái: đang tải, lỗi, trống (có / không lọc), có dữ liệu. */
export function ProjectListContent(props: ProjectListContentProps) {
  const { params, onCreate } = props;
  const { data, isPending, isError, error, refetch } = useProjects(params);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (data.data.length === 0) {
    const isFiltering = params.q !== '' || params.status !== null;
    return (
      <Card>
        {isFiltering ? (
          <EmptyState
            icon="search"
            title="Không có dự án phù hợp"
            action={
              <Button variant="secondary" onClick={props.onClearFilters}>
                Xoá lọc
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon="folder"
            title="Chưa có dự án"
            description={
              onCreate
                ? 'Tạo dự án để gom công việc của phòng theo mục tiêu.'
                : 'Trưởng phòng sẽ tạo dự án cho phòng ban.'
            }
            action={onCreate && <Button onClick={onCreate}>Tạo dự án</Button>}
          />
        )}
      </Card>
    );
  }
  return (
    <>
      <ProjectTable projects={data.data} />
      <Pagination {...data.meta} onChange={props.onPageChange} />
    </>
  );
}
