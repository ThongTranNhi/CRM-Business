import { cn } from '@/lib/cn';
import type { SearchGroup, SearchHit } from '../types';

interface SearchResultsListProps {
  id: string;
  groups: SearchGroup[];
  /** Vị trí dòng đang chọn bằng ↑/↓ trên danh sách đã gộp các nhóm. */
  active: number;
  onPick: (hit: SearchHit) => void;
}

export const hitId = (listId: string, hit: SearchHit) => `${listId}-${hit.key}`;

/** Kết quả nhóm Công việc / Nhân viên / Dự án / Phòng ban (tối đa 5 mỗi nhóm). */
export function SearchResultsList({ id, groups, active, onPick }: SearchResultsListProps) {
  // Vị trí dòng đầu của mỗi nhóm trong danh sách đã gộp (khớp `active`).
  const starts = groups.map((_, index) =>
    groups.slice(0, index).reduce((count, group) => count + group.hits.length, 0),
  );
  return (
    <ul id={id} role="listbox" aria-label="Kết quả tìm kiếm" className="py-1">
      {groups.map((group, groupIndex) => (
        <li key={group.label} role="presentation">
          <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {group.label}
          </p>
          <ul role="group" aria-label={group.label}>
            {group.hits.map((hit, hitIndex) => {
              const isActive = (starts[groupIndex] ?? 0) + hitIndex === active;
              return (
                <li
                  key={hit.key}
                  id={hitId(id, hit)}
                  role="option"
                  aria-selected={isActive}
                  // Giữ focus ở ô tìm kiếm khi bấm chuột.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onPick(hit)}
                  className={cn(
                    'cursor-pointer px-4 py-2 hover:bg-gray-50',
                    isActive && 'bg-primary-50',
                  )}
                >
                  <span className="block truncate text-sm text-gray-900">{hit.title}</span>
                  {hit.detail && (
                    <span className="block truncate text-xs text-gray-500">{hit.detail}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </li>
      ))}
    </ul>
  );
}
