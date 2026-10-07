import { useId, useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui';

interface QuickAddTaskProps {
  /** Tạo nhanh với tên đã nhập (trang quyết định tạo ngay hay mở modal đầy đủ); false = lỗi. */
  onSubmit: (title: string) => Promise<boolean>;
  isPending: boolean;
}

/** Ô "+ Thêm công việc" cuối cột nhóm todo: Enter tạo, Esc huỷ. */
export function QuickAddTask({ onSubmit, isPending }: QuickAddTaskProps) {
  const inputId = useId();
  const [isOpen, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [isSubmitting, setSubmitting] = useState(false);

  const close = () => {
    setOpen(false);
    setTitle('');
  };

  async function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      close();
      return;
    }
    // Bộ gõ tiếng Việt (ghép chữ) cũng phát Enter khi chốt chữ: bỏ qua, tránh tạo task tên dở.
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || isSubmitting || isPending) return;
    setSubmitting(true);
    const isCreated = await onSubmit(trimmed);
    setSubmitting(false);
    // Lỗi → giữ ô mở và giữ chữ đã gõ để sửa / thử lại.
    if (isCreated) close();
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
        readOnly={isSubmitting}
        aria-busy={isSubmitting}
        placeholder="Nhập tên rồi nhấn Enter, Esc để huỷ"
        onChange={(event) => setTitle(event.target.value)}
        onKeyDown={(event) => void handleKeyDown(event)}
        onBlur={() => !title.trim() && close()}
        className="h-10 w-full rounded-lg border border-primary-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
