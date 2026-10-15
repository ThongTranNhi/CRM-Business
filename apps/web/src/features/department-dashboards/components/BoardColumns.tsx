import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { DeleteTaskDialog, type BoardData, type BoardTask } from '@/features/tasks';
import { columnTasks } from '../board.utils';
import { BOARD_RELATED_KEYS } from '../hooks/board-related-keys';
import { useBoardDrag } from '../hooks/useBoardDrag';
import { useBoardMoves } from '../hooks/useBoardMoves';
import { BoardColumn, type ColumnContext } from './BoardColumn';
import { QuickAddTask } from './QuickAddTask';

export interface BoardColumnsProps {
  board: BoardData;
  boardKey: QueryKey;
  /** Thẻ đang hiện sau khi lọc. */
  visibleTasks: BoardTask[];
  isFiltering: boolean;
  today: string;
  avatarOf: (employeeId: string) => string | null;
  /** null: chỉ xem → không có ô thêm nhanh. */
  quickAdd: { onSubmit: (title: string) => Promise<boolean>; isPending: boolean } | null;
  /** [Xem thêm] ở cột Đã hoàn thành; null = đã hiện hết hoặc chạm giới hạn. */
  showMoreDone: { onClick: () => void; isLoading: boolean } | null;
  onDraggingChange: (isDragging: boolean) => void;
  onOpenTask: (taskId: string) => void;
}

/** Chuyển cột bằng menu → thẻ sang cột mới (DOM mới): đưa focus về thẻ để dùng tiếp bằng bàn phím. */
const focusCard = (taskId: string) =>
  requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(`[data-task-card="${taskId}"]`)?.focus(),
  );

/** Các cột vẽ từ board_columns (không hard-code), xếp ngang, cuộn ngang khi hẹp (min 280px / cột). */
export function BoardColumns(props: BoardColumnsProps) {
  const { board, visibleTasks } = props;
  const moves = useBoardMoves({ board, visibleTasks, boardKey: props.boardKey });
  const drag = useBoardDrag({ onDrop: moves.dropAt, onDraggingChange: props.onDraggingChange });
  const [deleting, setDeleting] = useState<BoardTask | null>(null);
  const context: ColumnContext = {
    columns: board.columns,
    today: props.today,
    avatarOf: props.avatarOf,
    isFiltering: props.isFiltering,
    doneTotal: board.doneTotal,
    draggingId: drag.draggingId,
    cardDragProps: drag.cardDragProps,
    onMoveToColumn: (taskId, columnId) => {
      moves.moveToEnd(taskId, columnId);
      focusCard(taskId);
    },
    onRequestDelete: setDeleting,
    onOpenTask: props.onOpenTask,
  };
  // Thêm nhanh chỉ ở cột đầu tiên (cột mặc định nhóm todo — nơi task mới được đặt).
  const firstColumn = board.columns[0];
  const quickAddColumnId = firstColumn?.status === 'todo' ? firstColumn.id : null;

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {board.columns.map((column) => (
          <BoardColumn
            key={column.id}
            column={column}
            tasks={columnTasks(visibleTasks, column.id)}
            context={context}
            placeholderIndex={drag.over?.columnId === column.id ? drag.over.index : null}
            dropProps={drag.columnDropProps(column.id)}
            footer={
              <>
                {column.id === quickAddColumnId && props.quickAdd && (
                  <QuickAddTask {...props.quickAdd} />
                )}
                {column.status === 'done' && props.showMoreDone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-2.5 mb-2.5"
                    loading={props.showMoreDone.isLoading}
                    onClick={props.showMoreDone.onClick}
                  >
                    Xem thêm việc đã hoàn thành
                  </Button>
                )}
              </>
            }
          />
        ))}
      </div>
      <DeleteTaskDialog
        task={deleting}
        boardKey={props.boardKey}
        relatedKeys={BOARD_RELATED_KEYS}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
