import { useEffect, useState } from 'react';

/** Giá trị chỉ đổi sau khi `value` đứng yên `delayMs` (tìm kiếm khi gõ — frontend-spec: debounce 300ms). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}
