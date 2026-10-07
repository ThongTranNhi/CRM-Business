import { useState } from 'react';
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

/** /app/workspace/:dashboardId — Board kiểu Trello của phòng ban. */
export function BoardPage() {
  const { dashboardId = '' } = useParams();
  const location = useLocation();
  const [doneLimit, setDoneLimit] = useState(DONE_PAGE);
  const [isDragging, setDragging] = useState(false);
  const dashboard = useDashboard(dashboardId);
  const boardId =
    dashboard.data?.boardId ?? linkStateSchema.safeParse(location.state).data?.boardId ?? null;
  const board = useBoard(boardId, { doneLimit, isPaused: isDragging });

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
      boardKey={taskKeys.board(boardId, doneLimit)}
      onShowMoreDone={
        canShowMore && doneLimit < DONE_MAX
          ? () => setDoneLimit((limit) => Math.min(limit + DONE_PAGE, DONE_MAX))
          : null
      }
      onDraggingChange={setDragging}
    />
  );
}
