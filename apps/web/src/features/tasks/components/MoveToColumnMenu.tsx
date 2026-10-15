import { useId, useState } from 'react';
import type { BoardColumn } from '../types';

interface MoveToColumnMenuProps {
  columns: BoardColumn[];
  currentColumnId: string;
  onMove: (columnId: string) => void;
}

/**
 * "Chuyển sang cột…" trên thẻ: thay kéo thả trên cảm ứng và khi dùng bàn phím (drag-and-drop.md).
 * Chọn cột rồi bấm [Chuyển] — không chuyển ngay khi đổi lựa chọn (phím ↓ trong select đã đổi lựa chọn).
 */
export function MoveToColumnMenu({ columns, currentColumnId, onMove }: MoveToColumnMenuProps) {
  const id = useId();
  const [target, setTarget] = useState('');
  const targets = columns.filter((column) => column.id !== currentColumnId);

  return (
    <div className="flex gap-1.5">
      <label htmlFor={id} className="sr-only">
        Chuyển sang cột
      </label>
      <select
        id={id}
        value={target}
        onChange={(event) => setTarget(event.target.value)}
        className="h-8 min-w-0 flex-1 rounded-md border border-gray-200 bg-gray-50 px-2 text-xs text-gray-600 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      >
        <option value="">Chuyển sang cột…</option>
        {targets.map((column) => (
          <option key={column.id} value={column.id}>
            {column.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        disabled={!target}
        onClick={() => {
          onMove(target);
          setTarget('');
        }}
        className="h-8 rounded-md border border-gray-200 bg-white px-2.5 text-xs font-medium text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Chuyển
      </button>
    </div>
  );
}
