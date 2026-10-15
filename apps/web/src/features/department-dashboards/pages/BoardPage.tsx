import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { Navigate, useLocation, useParams } from 'react-router-dom';
import { z } from 'zod';
import { ButtonLink, Card, EmptyState, ErrorState, Skeleton } from '@/components/ui';
import { taskKeys, useBoard } from '@/features/tasks';
import { ApiError } from '@/lib/api-client';
import { BoardContent } from '../components/BoardContent';
import { BoardSkeleton } from '../components/BoardStates';
import { useDashboard } from '../hooks/useDashboard';

const DONE_PAGE = 20;
const DONE_MAX = 200;

/** Bấm thẻ ở Workspace truyền boardId qua state → board tải song song với header (Q1). */
const linkStateSchema = z.object({ boardId: z.string().min(1) });

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  if (error instanceof ApiError && error.status === 403) return <Navigate to="/app/403" replace />;
  if (error instanceof ApiError && error.status === 404) {
    return (
      <Card>
        <EmptyState
          icon="grid"
          title="Không tìm thấy Dashboard"
          description="Dashboard không tồn tại hoặc đường dẫn đã sai."
          action={<ButtonLink to="/app/workspace">Về Workspace</ButtonLink>}
        />
      </Card>
    );
  }
  return (
    <Card>
      <ErrorState onRetry={onRetry} />
    </Card>
  );
}

/** /app/workspace/:dashboardId — Board kiểu Trello. `key` theo Dashboard: đổi Dashboard thì state mới. */
export function BoardPage() {
  const { dashboardId = '' } = useParams();
  return <DashboardBoard key={dashboardId} dashboardId={dashboardId} />;
}

function DashboardBoard({ dashboardId }: { dashboardId: string }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [doneLimit, setDoneLimit] = useState(DONE_PAGE);
  const [isDragging, setDragging] = useState(false);
  const dashboard = useDashboard(dashboardId);
  const boardId =
    dashboard.data?.boardId ?? linkStateSchema.safeParse(location.state).data?.boardId ?? null;
  const board = useBoard(boardId, { doneLimit, isPaused: isDragging });
  const boardKey = taskKeys.board(boardId ?? '', doneLimit);

  // Bắt đầu kéo: huỷ lượt tải đang chạy để dữ liệu mới không thay thẻ dưới tay người dùng.
  const onDraggingChange = useCallback(
    (dragging: boolean) => {
      if (dragging) void queryClient.cancelQueries({ queryKey: taskKeys.boards() });
      setDragging(dragging);
    },
    [queryClient],
  );

  if (dashboard.isError) {
    return <DashboardError error={dashboard.error} onRetry={() => void dashboard.refetch()} />;
  }
  if (dashboard.isPending || !boardId) {
    return (
      <>
        <Skeleton className="mb-6 h-14 w-80" />
        <BoardSkeleton />
      </>
    );
  }
  const doneShown = board.data?.tasks.filter((task) => task.status === 'done').length ?? 0;
  const canShowMore = board.data !== undefined && doneShown < board.data.doneTotal;
  return (
    <BoardContent
      dashboard={dashboard.data}
      board={board}
      boardKey={boardKey}
      showMoreDone={
        canShowMore && doneLimit < DONE_MAX
          ? {
              onClick: () => setDoneLimit((limit) => Math.min(limit + DONE_PAGE, DONE_MAX)),
              // Đang tải trang tiếp (thẻ đang hiện là dữ liệu cũ giữ tạm) → khoá nút.
              isLoading: board.isPlaceholderData,
            }
          : null
      }
      onDraggingChange={onDraggingChange}
    />
  );
}
