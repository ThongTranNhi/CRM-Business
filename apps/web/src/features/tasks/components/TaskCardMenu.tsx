import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui';

interface TaskCardMenuProps {
  taskTitle: string;
  onDelete: () => void;
}

/** Menu ⋯ trên thẻ task. Đợt 2: "Xoá công việc" (chỉ hiện khi người xem xoá được — BR-19). */
export function TaskCardMenu({ taskTitle, onDelete }: TaskCardMenuProps) {
  const [isOpen, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Đóng khi bấm ra ngoài hoặc nhấn Esc (cùng cách với menu tài khoản).
  useEffect(() => {
    if (!isOpen) return;
    const closeOnOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Thao tác với công việc ${taskTitle}`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setOpen((open) => !open)}
        className="rounded-md p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <Icon name="more" size={18} />
      </button>
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 z-10 mt-1 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-danger-800 hover:bg-danger-50"
          >
            <Icon name="trash" size={16} />
            Xoá công việc
          </button>
        </div>
      )}
    </div>
  );
}
