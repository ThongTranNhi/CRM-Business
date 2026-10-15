import { useCallback, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon } from '@/components/ui';
import { useDismiss } from '@/lib/use-dismiss';
import { useSearch } from '../hooks/useSearch';
import { useSlashFocus } from '../hooks/useSlashFocus';
import { MIN_QUERY, toSearchGroups } from '../search.utils';
import type { SearchHit } from '../types';
import { hitId, SearchResultsList } from './SearchResultsList';

/** Ô tìm kiếm ở Header (frontend-spec 3.2): ≥ 2 ký tự → dropdown nhóm kết quả; ↑/↓, Enter, Esc; phím `/`. */
export function HeaderSearch() {
  const navigate = useNavigate();
  const listId = useId();
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(containerRef, open, close);
  useSlashFocus(inputRef);
  const search = useSearch(text);
  const groups = search.isReady && search.data ? toSearchGroups(search.data) : [];
  const hits = groups.flatMap((group) => group.hits);
  const activeHit = hits[active];

  function go(hit: SearchHit) {
    setOpen(false);
    setText('');
    inputRef.current?.blur();
    navigate(hit.href);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
    } else if ((event.key === 'ArrowDown' || event.key === 'ArrowUp') && hits.length > 0) {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + hits.length) % hits.length);
    } else if (event.key === 'Enter' && activeHit) {
      event.preventDefault();
      go(activeHit);
    }
  }

  function renderBody(): ReactNode {
    if (text.trim().length < MIN_QUERY) return <Hint>Nhập ít nhất 2 ký tự để tìm.</Hint>;
    if (search.isError) return <Hint>Không tìm được, vui lòng thử lại.</Hint>;
    if (!search.data || !search.isReady) return <Hint>Đang tìm…</Hint>;
    if (hits.length === 0) return <Hint>Không có kết quả cho “{text.trim()}”.</Hint>;
    return <SearchResultsList id={listId} groups={groups} active={active} onPick={go} />;
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <Icon
        name="search"
        size={18}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Tìm kiếm"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && activeHit ? hitId(listId, activeHit) : undefined}
        placeholder="Tìm việc, dự án, phòng ban…  ( / )"
        value={text}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setText(event.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className="h-10 w-full rounded-lg border border-gray-200 bg-gray-50 pl-10 pr-3 text-sm placeholder:text-gray-400 focus:border-primary-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary-100"
      />
      {open && text.trim().length > 0 && (
        <div className="absolute left-0 right-0 mt-2 max-h-[70vh] overflow-y-auto rounded-card border border-gray-200 bg-white shadow-lg">
          {renderBody()}
        </div>
      )}
    </div>
  );
}

function Hint({ children }: { children: ReactNode }) {
  return <p className="px-4 py-3 text-sm text-gray-500">{children}</p>;
}
