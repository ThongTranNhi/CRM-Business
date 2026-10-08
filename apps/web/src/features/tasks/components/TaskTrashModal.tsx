import type { QueryKey } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import {
  Button,
  EmptyState,
  ErrorState,
  Icon,
  Modal,
  Pagination,
  SearchInput,
  Skeleton,
} from '@/components/ui';
import { formatDateTime } from '@/lib/format-date';
import { useRestoreTask } from '../hooks/useRestoreTask';
import { useTaskTrash } from '../hooks/useTaskTrash';
import type { TrashTask } from '../types';

interface TaskTrashModalProps {
  open: boolean;
  onClose: () => void;
  boardId: string;
  /** `all`: Super Admin, Trưởng phòng thấy mọi việc đã xoá; `own`: chỉ việc mình tạo. */
  scope: 'all' | 'own';
  relatedKeys: readonly QueryKey[];
}

const SCOPE_NOTE = {
  all: 'Mọi công việc đã xoá của board.',
  own: 'Công việc bạn đã tạo và đã bị xoá.',
} as const;

/** Thùng rác board: tìm, phân trang, [Khôi phục] — task về cuối cột cũ. Không có xoá vĩnh viễn (BR-19). */
export function TaskTrashModal({ open, onClose, ...props }: TaskTrashModalProps) {
  return (
    <Modal open={open} title="Thùng rác" onClose={onClose}>
      <TrashContent {...props} />
    </Modal>
  );
}

function TrashContent({
  boardId,
  scope,
  relatedKeys,
}: Omit<TaskTrashModalProps, 'open' | 'onClose'>) {
  const [params, setParams] = useState({ page: 1, q: '' });
  const trash = useTaskTrash(boardId, params);
  const restore = useRestoreTask(relatedKeys);
  const onSearch = useCallback((q: string) => setParams({ page: 1, q }), []);

  // Khôi phục việc cuối cùng của một trang → lùi về trang trước.
  const isPageEmpty = trash.data?.data.length === 0 && !trash.isPlaceholderData;
  if (isPageEmpty && params.page > 1) setParams({ ...params, page: params.page - 1 });

  function renderList() {
    if (trash.isPending) {
      return (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      );
    }
    if (trash.isError) return <ErrorState onRetry={() => void trash.refetch()} />;
    if (trash.data.data.length === 0) {
      return params.q ? (
        <EmptyState icon="search" title="Không tìm thấy công việc phù hợp" />
      ) : (
        <EmptyState icon="trash" title="Thùng rác trống" />
      );
    }
    return (
      <>
        <ul className="max-h-[60vh] divide-y divide-gray-100 overflow-y-auto">
          {trash.data.data.map((task) => (
            <TrashRow
              key={task.id}
              task={task}
              isRestoring={restore.isPending && restore.variables === task.id}
              onRestore={() => restore.mutate(task.id)}
            />
          ))}
        </ul>
        <Pagination
          {...trash.data.meta}
          onChange={(page) => setParams((current) => ({ ...current, page }))}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        {SCOPE_NOTE[scope]} Khôi phục đưa công việc về cuối cột cũ.
      </p>
      <SearchInput
        value={params.q}
        onSearch={onSearch}
        label="Tìm trong thùng rác"
        placeholder="Tìm theo tên công việc"
      />
      {renderList()}
    </div>
  );
}

interface TrashRowProps {
  task: TrashTask;
  isRestoring: boolean;
  onRestore: () => void;
}

function TrashRow({ task, isRestoring, onRestore }: TrashRowProps) {
  const deletedBy = task.archivedBy ? ` bởi ${task.archivedBy.fullName}` : '';
  return (
    <li className="flex items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="truncate font-medium text-gray-900" title={task.title}>
          {task.title}
        </p>
        <p className="text-sm text-gray-600">
          {task.columnName} · {task.assignee.fullName}
        </p>
        <p className="text-xs text-gray-500">
          Đã xoá{deletedBy} lúc {formatDateTime(new Date(task.archivedAt))}
        </p>
      </div>
      <Button variant="secondary" size="sm" loading={isRestoring} onClick={onRestore}>
        <Icon name="restore" size={16} />
        Khôi phục
      </Button>
    </li>
  );
}
