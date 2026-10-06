import { Button, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useDashboards } from '@/features/department-dashboards';
import { filterDashboards } from '../workspace.utils';
import { DashboardTile, NewDashboardTile } from './DashboardTile';

const GRID_CLASSES = 'grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
const SKELETON_TILES = 6;

interface DashboardGridProps {
  query: string;
  onCreate: () => void;
  onClearSearch: () => void;
}

/** Lưới thẻ Dashboard đã tạo (BR-03) với đủ 4 trạng thái: tải, lỗi, trống, có dữ liệu. */
export function DashboardGrid({ query, onCreate, onClearSearch }: DashboardGridProps) {
  const { data, isPending, isError, refetch } = useDashboards();
  const canCreate = useCan()('dashboards.create');

  if (isPending) {
    return (
      <ul className={GRID_CLASSES} aria-label="Đang tải Dashboard">
        {Array.from({ length: SKELETON_TILES }, (_, index) => (
          <li key={index}>
            <Skeleton className="h-48 w-full rounded-card" />
          </li>
        ))}
      </ul>
    );
  }
  if (isError) {
    return (
      <Card>
        <ErrorState onRetry={() => void refetch()} />
      </Card>
    );
  }
  if (data.length === 0) {
    return (
      <Card>
        {canCreate ? (
          <EmptyState
            icon="grid"
            title="Chưa có Dashboard nào"
            description="Tạo Dashboard cho một phòng ban để bắt đầu giao việc."
            action={<Button onClick={onCreate}>Tạo Dashboard</Button>}
          />
        ) : (
          <EmptyState
            icon="grid"
            title="Phòng của bạn chưa có Dashboard"
            description="Hãy liên hệ trưởng phòng."
          />
        )}
      </Card>
    );
  }
  const cards = filterDashboards(data, query);
  if (cards.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="search"
          title="Không có Dashboard khớp tìm kiếm"
          action={
            <Button variant="secondary" onClick={onClearSearch}>
              Xoá tìm kiếm
            </Button>
          }
        />
      </Card>
    );
  }
  return (
    <ul className={GRID_CLASSES}>
      {cards.map((card) => (
        <li key={card.id}>
          <DashboardTile card={card} />
        </li>
      ))}
      {canCreate && (
        <li>
          <NewDashboardTile onClick={onCreate} />
        </li>
      )}
    </ul>
  );
}
