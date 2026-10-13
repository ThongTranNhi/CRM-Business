import { useEffect, type RefObject } from 'react';
import { isTypingTarget } from '../search.utils';

/** Phím `/` ở bất kỳ đâu (trừ khi đang gõ trong ô nhập) → focus ô tìm kiếm (frontend-spec 3.2). */
export function useSlashFocus(inputRef: RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      inputRef.current?.focus();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [inputRef]);
}
