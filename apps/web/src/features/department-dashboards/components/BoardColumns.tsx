import type { QueryKey } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui';
import { DeleteTaskDialog, type BoardData, type BoardTask } from '@/features/tasks';
import { columnTasks } from '../board.utils';
import { dashboardKeys } from '../hooks/dashboard-keys';
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
  quickAdd: { onSubmit: (title: string) => Promise<void>; isPending: boolean } | null;
  onShowMoreDone: (() => void) | null;
  onDraggingChange: (isDragging: boolean) => void;
}

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
    draggingId: drag.draggingId,
    cardDragProps: drag.cardDragProps,
    onMoveToColumn: moves.moveToEnd,
    onRequestDelete: setDeleting,
  };

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
                {column.status === 'todo' && props.quickAdd && <QuickAddTask {...props.quickAdd} />}
                {column.status === 'done' && props.onShowMoreDone && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mx-2.5 mb-2.5"
                    onClick={props.onShowMoreDone}
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
        relatedKeys={[dashboardKeys.all]}
        onClose={() => setDeleting(null)}
      />
    </>
  );
}
