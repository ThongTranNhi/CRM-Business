import { useId } from 'react';
import type { BoardColumn } from '../types';

interface MoveToColumnMenuProps {
  columns: BoardColumn[];
  currentColumnId: string;
  onMove: (columnId: string) => void;
}

/**
 * "Chuyển sang cột…" trên thẻ: thay kéo thả trên màn hình cảm ứng và khi dùng bàn phím
 * (drag-and-drop.md). Select gốc → trên điện thoại mở bảng chọn của hệ điều hành.
 */
export function MoveToColumnMenu({ columns, currentColumnId, onMove }: MoveToColumnMenuProps) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="sr-only">
        Chuyển sang cột
      </label>
      <select
        id={id}
        value=""
        onChange={(event) => {
          if (event.target.value) onMove(event.target.value);
        }}
        className="h-8 w-full rounded-md border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      >
        <option value="">Chuyển sang cột…</option>
        {columns
          .filter((column) => column.id !== currentColumnId)
          .map((column) => (
            <option key={column.id} value={column.id}>
              {column.name}
            </option>
          ))}
      </select>
    </div>
  );
}
