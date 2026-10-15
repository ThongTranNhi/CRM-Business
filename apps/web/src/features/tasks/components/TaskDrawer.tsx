import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState, ErrorState, Modal, Skeleton } from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { useTask } from '../hooks/useTask';
import type { BoardData, MemberOption, ProjectRef, TaskDetail } from '../types';
import { DeleteTaskDialog } from './DeleteTaskDialog';
import { TaskActivitySection } from './TaskActivitySection';
import { TaskChecklistSection } from './TaskChecklistSection';
import { TaskCommentsSection } from './TaskCommentsSection';
import { TaskDetailFields } from './TaskDetailFields';
import { TaskDetailHeader } from './TaskDetailHeader';

/** Dữ liệu board mà drawer dùng chung: cột (chuyển cột), thành viên (chọn người, ảnh), query key. */
export interface TaskDrawerBoard {
  /** undefined: board chưa tải xong (mở thẳng link `?task=`) — chưa chuyển cột được. */
  data: BoardData | undefined;
  boardKey: QueryKey;
  relatedKeys: readonly QueryKey[];
  members: MemberOption[];
  /** Dự án chưa lưu trữ của phòng (ô "Dự án", BR-30). */
  projects: ProjectRef[];
}

interface TaskDrawerProps {
  /** null = đóng. */
  taskId: string | null;
  onClose: () => void;
  board: TaskDrawerBoard;
}

type DeleteTarget = Pick<TaskDetail, 'id' | 'title'>;

/**
 * Chi tiết task dạng drawer bên phải (task-management.md, URL `?task=<id>`). Hộp xoá nằm ngoài drawer:
 * drawer đóng ngay khi xác nhận, toast [Hoàn tác] vẫn hoạt động.
 */
export function TaskDrawer({ taskId, onClose, board }: TaskDrawerProps) {
  const [deleting, setDeleting] = useState<DeleteTarget | null>(null);
  return (
    <>
      <Modal open={taskId !== null} title="Chi tiết công việc" placement="right" onClose={onClose}>
        {taskId && (
          <DrawerBody key={taskId} taskId={taskId} board={board} onRequestDelete={setDeleting} />
        )}
      </Modal>
      <DeleteTaskDialog
        task={deleting}
        boardKey={board.boardKey}
        relatedKeys={board.relatedKeys}
        onClose={() => setDeleting(null)}
        onDeleted={onClose}
      />
    </>
  );
}

interface DrawerBodyProps {
  taskId: string;
  board: TaskDrawerBoard;
  onRequestDelete: (task: DeleteTarget) => void;
}

function DrawerBody({ taskId, board, onRequestDelete }: DrawerBodyProps) {
  const task = useTask(taskId);
  if (task.isPending) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }
  if (task.isError) {
    const isMissing = task.error instanceof ApiError && task.error.status < 500;
    return isMissing ? (
      <EmptyState
        icon="search"
        title="Không tìm thấy công việc"
        description="Công việc không tồn tại, đã bị xoá hoặc bạn không có quyền xem."
      />
    ) : (
      <ErrorState onRetry={() => void task.refetch()} />
    );
  }
  return <TaskDetailView task={task.data} board={board} onRequestDelete={onRequestDelete} />;
}

interface TaskDetailViewProps {
  task: TaskDetail;
  board: TaskDrawerBoard;
  onRequestDelete: (task: DeleteTarget) => void;
}

function TaskDetailView({ task, board, onRequestDelete }: TaskDetailViewProps) {
  const avatars = new Map(board.members.map((member) => [member.id, member.avatarUrl]));
  const avatarOf = (employeeId: string | null) =>
    employeeId ? (avatars.get(employeeId) ?? null) : null;
  return (
    <div className="space-y-8">
      <TaskDetailHeader task={task} board={board} onRequestDelete={() => onRequestDelete(task)} />
      <TaskDetailFields task={task} board={board} />
      <TaskChecklistSection
        taskId={task.id}
        canEdit={task.permissions.canEdit}
        boardKey={board.boardKey}
      />
      <TaskCommentsSection
        taskId={task.id}
        canComment={task.permissions.canComment}
        avatarOf={avatarOf}
        relatedKeys={board.relatedKeys}
        members={board.members}
      />
      <TaskActivitySection taskId={task.id} />
    </div>
  );
}
