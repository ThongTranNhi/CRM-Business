import type { UseQueryResult } from '@tanstack/react-query';
import { useState } from 'react';
import { Button, Card, EmptyState, ErrorState } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { CreateTaskModal, TaskDrawer, TaskTrashModal, type BoardData } from '@/features/tasks';
import { todayInVietnam } from '@/lib/format-date';
import { hasFilters, matchesFilters } from '../board.utils';
import { dashboardKeys } from '../hooks/dashboard-keys';
import { useBoardFilters } from '../hooks/useBoardFilters';
import { useQuickAddTask } from '../hooks/useQuickAddTask';
import { useTaskParam } from '../hooks/useTaskParam';
import type { DashboardDetail } from '../types';
import { BoardColumns, type BoardColumnsProps } from './BoardColumns';
import { BoardFilters } from './BoardFilters';
import { BoardHeader } from './BoardHeader';
import { BoardSkeleton, ReadOnlyBanner } from './BoardStates';

interface BoardContentProps {
  dashboard: DashboardDetail;
  board: UseQueryResult<BoardData>;
  boardKey: BoardColumnsProps['boardKey'];
  /** null: đã hiện hết việc xong hoặc chạm giới hạn 200. */
  showMoreDone: BoardColumnsProps['showMoreDone'];
  onDraggingChange: (isDragging: boolean) => void;
}

/** Header, thanh lọc, các cột, modal Thêm công việc của board `/app/workspace/:dashboardId`. */
export function BoardContent({ dashboard, board, ...props }: BoardContentProps) {
  const { data: user } = useCurrentUser();
  const { filters, update, clear } = useBoardFilters();
  const [form, setForm] = useState<{ title: string } | null>(null);
  const [isTrashOpen, setTrashOpen] = useState(false);
  const { trashScope } = dashboard.viewer;
  const drawer = useTaskParam();
  const relatedKeys = [dashboardKeys.all];
  const quickAdd = useQuickAddTask(dashboard, (title) => setForm({ title }));
  const canWrite = dashboard.viewer.canWrite;
  const avatars = new Map(dashboard.members.map((member) => [member.id, member.avatarUrl]));
  const today = todayInVietnam();
  const context = { employeeId: user?.employeeId ?? null, today };
  const visibleTasks = (board.data?.tasks ?? []).filter((task) =>
    matchesFilters(task, filters, context),
  );

  function renderBoard() {
    if (board.isPending) return <BoardSkeleton />;
    if (board.isError) {
      return (
        <Card>
          <ErrorState onRetry={() => void board.refetch()} />
        </Card>
      );
    }
    if (hasFilters(filters) && board.data.tasks.length > 0 && visibleTasks.length === 0) {
      return (
        <Card>
          <EmptyState
            icon="search"
            title="Không có công việc khớp bộ lọc"
            action={
              <Button variant="secondary" onClick={clear}>
                Xoá lọc
              </Button>
            }
          />
        </Card>
      );
    }
    return (
      <BoardColumns
        board={board.data}
        boardKey={props.boardKey}
        visibleTasks={visibleTasks}
        isFiltering={hasFilters(filters)}
        today={today}
        avatarOf={(id) => avatars.get(id) ?? null}
        quickAdd={canWrite ? quickAdd : null}
        showMoreDone={props.showMoreDone}
        onDraggingChange={props.onDraggingChange}
        onOpenTask={drawer.open}
      />
    );
  }

  return (
    <>
      <BoardHeader
        dashboard={dashboard}
        onAddTask={canWrite ? () => setForm({ title: '' }) : null}
        onOpenTrash={trashScope ? () => setTrashOpen(true) : null}
      />
      {!canWrite && <ReadOnlyBanner isDepartmentArchived={dashboard.departmentArchived} />}
      <BoardFilters filters={filters} onChange={update} onClear={clear} />
      {renderBoard()}
      <CreateTaskModal
        open={form !== null}
        onClose={() => setForm(null)}
        boardId={dashboard.boardId}
        departmentName={dashboard.department.name}
        members={dashboard.members}
        relatedKeys={relatedKeys}
        initialTitle={form?.title}
      />
      <TaskDrawer
        taskId={drawer.taskId}
        onClose={drawer.close}
        board={{
          data: board.data,
          boardKey: props.boardKey,
          relatedKeys,
          members: dashboard.members,
        }}
      />
      {trashScope && (
        <TaskTrashModal
          open={isTrashOpen}
          onClose={() => setTrashOpen(false)}
          boardId={dashboard.boardId}
          scope={trashScope}
          relatedKeys={relatedKeys}
        />
      )}
    </>
  );
}
