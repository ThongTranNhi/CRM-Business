import { useEffect, useId, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Icon } from './Icon';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Nút cuối hộp thoại khi nội dung không phải form (form tự đặt ModalActions bên trong). */
  footer?: ReactNode;
  /** `right`: drawer bên phải, cao full màn hình, tiêu đề cố định, nội dung cuộn riêng. */
  placement?: 'center' | 'right';
}

const DIALOG_CLASSES = {
  center: 'w-[calc(100%-2rem)] max-w-lg rounded-card',
  right: 'my-0 ml-auto mr-0 h-dvh max-h-dvh w-full max-w-2xl',
};

/**
 * Dùng <dialog> gốc: tự giữ focus trong hộp thoại, Esc để đóng.
 * Bấm nền cũng đóng. Nội dung chỉ render khi mở nên form luôn bắt đầu sạch.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  placement = 'center',
}: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const isDrawer = placement === 'right';

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      className={cn('bg-white p-0 shadow-xl backdrop:bg-gray-900/40', DIALOG_CLASSES[placement])}
    >
      {open && (
        <div className={cn(isDrawer ? 'flex h-full flex-col' : 'p-6')}>
          <div
            className={cn(
              'flex items-start justify-between gap-4',
              isDrawer ? 'border-b border-gray-200 px-6 py-4' : 'mb-4',
            )}
          >
            <h2 id={titleId} className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="rounded-lg p-1 text-gray-500 hover:bg-gray-100"
            >
              <Icon name="x" size={20} />
            </button>
          </div>
          {isDrawer ? <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div> : children}
          {footer && <ModalActions>{footer}</ModalActions>}
        </div>
      )}
    </dialog>
  );
}

/** Hàng nút cuối hộp thoại; form trong Modal đặt nút gửi ở đây để Enter vẫn gửi được. */
export function ModalActions({ children }: { children: ReactNode }) {
  return <div className="mt-6 flex flex-wrap justify-end gap-2">{children}</div>;
}
