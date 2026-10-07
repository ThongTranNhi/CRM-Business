import { useState, type DragEvent } from 'react';
import { indexFromPointer } from '../board.utils';

interface DragState {
  taskId: string;
  /** Cột và chỗ thả hiện tại (chỉ số trong các thẻ đang hiện, đã bỏ thẻ đang kéo). */
  over: { columnId: string; index: number } | null;
}

interface UseBoardDragOptions {
  onDrop: (drop: { taskId: string; columnId: string; index: number }) => void;
  /** Báo trang tạm dừng tự tải lại board trong lúc kéo. */
  onDraggingChange: (isDragging: boolean) => void;
}

/** Điểm giữa theo chiều dọc của các thẻ trong cột (trừ thẻ đang kéo) để tìm chỗ thả. */
function cardMidpoints(column: HTMLElement, draggedId: string): number[] {
  return Array.from(column.querySelectorAll<HTMLElement>('[data-task-card]'))
    .filter((card) => card.dataset.taskCard !== draggedId)
    .map((card) => {
      const rect = card.getBoundingClientRect();
      return rect.top + rect.height / 2;
    });
}

/** Kéo thả HTML5 gốc (drag-and-drop.md, không thư viện): thẻ mờ, ô giữ chỗ, cột đích viền nét đứt. */
export function useBoardDrag({ onDrop, onDraggingChange }: UseBoardDragOptions) {
  const [drag, setDrag] = useState<DragState | null>(null);

  const stop = () => {
    setDrag(null);
    onDraggingChange(false);
  };

  const cardDragProps = (taskId: string) => ({
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', taskId);
      setDrag({ taskId, over: null });
      onDraggingChange(true);
    },
    onDragEnd: stop,
  });

  const columnDropProps = (columnId: string) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!drag) return;
      event.preventDefault();
      const index = indexFromPointer(
        cardMidpoints(event.currentTarget, drag.taskId),
        event.clientY,
      );
      if (drag.over?.columnId !== columnId || drag.over.index !== index) {
        setDrag({ taskId: drag.taskId, over: { columnId, index } });
      }
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (drag?.over?.columnId === columnId) {
        onDrop({ taskId: drag.taskId, columnId, index: drag.over.index });
      }
      stop();
    },
  });

  return {
    draggingId: drag?.taskId ?? null,
    over: drag?.over ?? null,
    cardDragProps,
    columnDropProps,
  };
}
