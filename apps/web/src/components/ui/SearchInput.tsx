import { useEffect, useState } from 'react';
import { Icon } from './Icon';

const DEBOUNCE_MS = 300;

interface SearchInputProps {
  /** Từ khoá đang áp dụng (thường đọc từ URL `?q=`). */
  value: string;
  /** Gọi sau khi người dùng ngừng gõ 300ms. */
  onSearch: (value: string) => void;
  label: string;
  placeholder?: string;
}

export function SearchInput({ value, onSearch, label, placeholder }: SearchInputProps) {
  const [text, setText] = useState(value);

  useEffect(() => {
    const trimmed = text.trim();
    if (trimmed === value) return;
    const timer = setTimeout(() => onSearch(trimmed), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [text, value, onSearch]);

  return (
    <div className="relative w-full">
      <Icon
        name="search"
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        type="search"
        aria-label={label}
        placeholder={placeholder}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
    </div>
  );
}
