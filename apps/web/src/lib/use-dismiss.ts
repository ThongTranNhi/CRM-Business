import { useEffect, type RefObject } from 'react';

/** Menu thả xuống: bấm ra ngoài vùng `ref` hoặc nhấn Esc → gọi `onDismiss` (chỉ khi đang mở). */
export function useDismiss(
  ref: RefObject<HTMLElement | null>,
  isOpen: boolean,
  onDismiss: () => void,
) {
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (event.target instanceof Node && !ref.current?.contains(event.target)) onDismiss();
    }
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') onDismiss();
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [ref, isOpen, onDismiss]);
}
