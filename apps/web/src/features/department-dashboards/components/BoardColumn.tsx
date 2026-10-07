import type { DragEvent, HTMLAttributes, ReactNode } from 'react';
import {
  MoveToColumnMenu,
  TaskCard,
  TaskCardMenu,
  type BoardColumn as Column,
  type BoardTask,
  type TaskStatus,
} from '@/features/tasks';
import { cn } from '@/lib/cn';

// Màu theo nhóm trạng thái của cột: todo = gray, in_progress = info, done = success (colors.md mục 4).
const STATUS_STYLES: Record<TaskStatus, { dot: string; body: string }> = {
  todo: { dot: 'bg-gray-400', body: 'bg-gray-100' },
  in_progress: { dot: 'bg-info-500', body: 'bg-info-50' },
  done: { dot: 'bg-success-500', body: 'bg-success-50' },
};

/** Dùng chung cho mọi cột của board. */
export interface ColumnContext {
  columns: Column[];
  today: string;
  avatarOf: (employeeId: string) => string | null;
  isFiltering: boolean;
  draggingId: string | null;
  cardDragProps: (taskId: string) => HTMLAttributes<HTMLElement> & { draggable: boolean };
  onMoveToColumn: (taskId: string, columnId: string) => void;
  onRequestDelete: (task: BoardTask) => void;
}

interface BoardColumnProps {
  column: Column;
  /** Thẻ đang hiện (đã lọc, theo position), gồm cả thẻ đang kéo. */
  tasks: BoardTask[];
  context: ColumnContext;
  /** Chỗ ô giữ chỗ khi kéo qua cột này (chỉ số trong các thẻ không kéo); null = không kéo qua. */
  placeholderIndex: number | null;
  dropProps: {
    onDragOver: (event: DragEvent<HTMLElement>) => void;
    onDrop: (event: DragEvent<HTMLElement>) => void;
  };
  footer?: ReactNode;
}

const Placeholder = () => (
  <div
    aria-hidden="true"
    className="h-14 rounded-lg border-2 border-dashed border-primary-500 bg-primary-50"
  />
);

export function BoardColumn(props: BoardColumnProps) {
  const { column, tasks, context, placeholderIndex } = props;
  const styles = STATUS_STYLES[column.status];
  const items: ReactNode[] = [];
  let slot = 0;
  for (const task of tasks) {
    const isDragged = task.id === context.draggingId;
    if (!isDragged && slot === placeholderIndex) items.push(<Placeholder key="placeholder" />);
    if (!isDragged) slot += 1;
    items.push(<ColumnCard key={task.id} task={task} context={context} />);
  }
  if (slot === placeholderIndex) items.push(<Placeholder key="placeholder" />);

  return (
    <section
      aria-label={column.name}
      {...props.dropProps}
      className={cn(
        'flex max-h-[calc(100vh-15rem)] min-h-48 min-w-[280px] flex-1 flex-col rounded-card',
        styles.body,
        placeholderIndex !== null &&
          'outline-dashed outline-2 -outline-offset-4 outline-primary-500',
      )}
    >
      <header className="flex items-center gap-2 px-3.5 pb-2 pt-3 text-xs font-bold tracking-wide text-gray-700">
        <span aria-hidden="true" className={cn('h-2 w-2 rounded-full', styles.dot)} />
        {column.name}
        <span className="ml-auto rounded-full bg-white px-2 font-semibold text-gray-600">
          {tasks.length}
        </span>
      </header>
      <div className="grid min-h-20 flex-1 content-start gap-2 overflow-y-auto px-2.5 pb-2.5">
        {items.length > 0 ? (
          items
        ) : (
          <p className="px-2 py-4 text-center text-sm text-gray-500">
            {context.isFiltering ? 'Không có việc khớp bộ lọc' : 'Chưa có công việc'}
          </p>
        )}
      </div>
      {props.footer}
    </section>
  );
}

function ColumnCard({ task, context }: { task: BoardTask; context: ColumnContext }) {
  return (
    <TaskCard
      task={task}
      today={context.today}
      avatarOf={context.avatarOf}
      isDragging={task.id === context.draggingId}
      dragProps={task.canMove ? context.cardDragProps(task.id) : undefined}
      actionsMenu={
        task.canArchive && (
          <TaskCardMenu taskTitle={task.title} onDelete={() => context.onRequestDelete(task)} />
        )
      }
      moveMenu={
        task.canMove && (
          <MoveToColumnMenu
            columns={context.columns}
            currentColumnId={task.columnId}
            onMove={(columnId) => context.onMoveToColumn(task.id, columnId)}
          />
        )
      }
    />
  );
}
