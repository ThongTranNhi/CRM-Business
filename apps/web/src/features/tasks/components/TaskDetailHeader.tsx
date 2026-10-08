import { useState, type KeyboardEvent } from 'react';
import { Badge, Button, Icon, useToast } from '@/components/ui';
import { useMoveTask } from '../hooks/useMoveTask';
import { useUpdateTask } from '../hooks/useTaskEdits';
import { sentenceCase } from '../task-detail.utils';
import type { TaskDetail } from '../types';
import { MoveToColumnMenu } from './MoveToColumnMenu';
import type { TaskDrawerBoard } from './TaskDrawer';
import { TaskCardMenu } from './TaskCardMenu';

const TITLE_MAX = 200;

interface TaskDetailHeaderProps {
  task: TaskDetail;
  board: TaskDrawerBoard;
  onRequestDelete: () => void;
}

/** Đầu drawer: tên (sửa tại chỗ), cột hiện tại + chuyển cột, [Sao chép link], menu ⋯ → Xoá. */
export function TaskDetailHeader({ task, board, onRequestDelete }: TaskDetailHeaderProps) {
  const toast = useToast();
  const options = { taskId: task.id, boardKey: board.boardKey, relatedKeys: board.relatedKeys };
  const update = useUpdateTask(options);
  const move = useMoveTask(options);
  // Cột lấy theo thẻ trên board (đổi ngay khi chuyển — optimistic), chưa có thì theo chi tiết.
  const columnId = board.data?.tasks.find((card) => card.id === task.id)?.columnId ?? task.columnId;
  const column = board.data?.columns.find((candidate) => candidate.id === columnId);

  async function copyLink() {
    const url = `${window.location.origin}${window.location.pathname}?task=${task.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: 'Đã sao chép link công việc' });
    } catch {
      toast({
        tone: 'error',
        message: 'Không sao chép được, hãy sao chép địa chỉ trên trình duyệt',
      });
    }
  }

  return (
    <div className="space-y-3">
      <TitleField
        key={task.title}
        title={task.title}
        canEdit={task.permissions.canEdit}
        onSave={(title) => update.mutate({ changes: { title }, preview: { title } })}
      />
      <div className="flex flex-wrap items-center gap-2">
        {column && <Badge tone="neutral">{sentenceCase(column.name)}</Badge>}
        {task.permissions.canEdit && board.data && (
          <div className="w-60">
            <MoveToColumnMenu
              columns={board.data.columns}
              currentColumnId={columnId}
              onMove={(toColumnId) =>
                move.mutate({ taskId: task.id, toColumnId, previousTaskId: null, nextTaskId: null })
              }
            />
          </div>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="secondary" size="sm" onClick={() => void copyLink()}>
            <Icon name="link" size={16} />
            Sao chép link
          </Button>
          {task.permissions.canArchive && (
            <TaskCardMenu taskTitle={task.title} onDelete={onRequestDelete} />
          )}
        </div>
      </div>
    </div>
  );
}

interface TitleFieldProps {
  title: string;
  canEdit: boolean;
  onSave: (title: string) => void;
}

/** Tên task: chỉ đọc → tiêu đề; sửa được → ô nhập, Enter / rời ô để lưu, Esc để huỷ. */
function TitleField({ title, canEdit, onSave }: TitleFieldProps) {
  const [draft, setDraft] = useState(title);
  const [error, setError] = useState<string | null>(null);
  if (!canEdit) return <h3 className="text-xl font-semibold text-gray-900">{title}</h3>;

  function save() {
    const next = draft.trim();
    if (next === title) return setError(null);
    if (!next || next.length > TITLE_MAX) {
      setError(next ? `Tên công việc tối đa ${TITLE_MAX} ký tự` : 'Vui lòng nhập tên công việc');
      return;
    }
    setError(null);
    onSave(next);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      // Esc huỷ sửa, không đóng drawer.
      event.preventDefault();
      setDraft(title);
      setError(null);
    }
  }

  return (
    <div>
      <input
        aria-label="Tên công việc"
        aria-invalid={Boolean(error)}
        value={draft}
        maxLength={TITLE_MAX + 50}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={save}
        onKeyDown={onKeyDown}
        className="w-full rounded-lg border border-transparent px-2 py-1 -ml-2 text-xl font-semibold text-gray-900 hover:border-gray-200 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
      {error && <p className="mt-1 text-sm text-danger-700">{error}</p>}
    </div>
  );
}
