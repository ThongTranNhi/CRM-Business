import { useId, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui';

interface QuickAddTaskProps {
  /** Tạo nhanh với tên đã nhập (trang quyết định tạo ngay hay mở modal đầy đủ). */
  onSubmit: (title: string) => Promise<void> | void;
  isPending: boolean;
}

/** Ô "+ Thêm công việc" cuối cột nhóm todo: Enter tạo, Esc huỷ. */
export function QuickAddTask({ onSubmit, isPending }: QuickAddTaskProps) {
  const inputId = useId();
  const [isOpen, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') close();
    if (event.key !== 'Enter' || !title.trim() || isPending) return;
    event.preventDefault();
    await onSubmit(title.trim());
    close();
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-2.5 mb-2.5 flex items-center gap-1.5 rounded-lg px-2 py-2 text-sm font-medium text-gray-600 hover:bg-white/70 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
      >
        <Icon name="plus" size={16} />
        Thêm công việc
      </button>
    );
  }
  return (
    <div className="mx-2.5 mb-2.5">
      <label className="sr-only" htmlFor={inputId}>
        Tên công việc mới
      </label>
      <input
        id={inputId}
        autoFocus
        value={title}
        maxLength={200}
        disabled={isPending}
        placeholder="Nhập tên rồi nhấn Enter, Esc để huỷ"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => void handleKeyDown(event)}
        onBlur={() => !title.trim() && close()}
        className="h-10 w-full rounded-lg border border-primary-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
