import { useId, type ReactNode } from 'react';
import { Button, Icon, SearchInput } from '@/components/ui';
import { PRIORITIES, PRIORITY_META } from '@/features/tasks';
import { cn } from '@/lib/cn';
import {
  DUE_FILTERS,
  hasFilters,
  type BoardFilters as Filters,
  type DueFilter,
} from '../board.utils';

const DUE_LABELS: Record<DueFilter, string> = {
  overdue: 'Quá hạn',
  today: 'Hôm nay',
  week: 'Tuần này',
};

interface BoardFiltersProps {
  filters: Filters;
  onChange: (changes: Partial<Filters>) => void;
  onClear: () => void;
}

/** Thanh lọc board (department-dashboard.md): tên / người phụ trách, Việc của tôi, hạn, ưu tiên. */
export function BoardFilters({ filters, onChange, onClear }: BoardFiltersProps) {
  const priorityId = useId();
  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="w-full sm:w-72">
        <SearchInput
          value={filters.q}
          onSearch={(q) => onChange({ q })}
          label="Tìm trong board"
          placeholder="Tìm theo tên việc, người phụ trách"
        />
      </div>
      <FilterChip isOn={filters.mine} onClick={() => onChange({ mine: !filters.mine })}>
        <Icon name="checkSquare" size={16} />
        Việc của tôi
      </FilterChip>
      {DUE_FILTERS.map((due) => (
        <FilterChip
          key={due}
          isOn={filters.due === due}
          onClick={() => onChange({ due: filters.due === due ? null : due })}
        >
          {DUE_LABELS[due]}
        </FilterChip>
      ))}
      <label htmlFor={priorityId} className="sr-only">
        Lọc theo ưu tiên
      </label>
      <select
        id={priorityId}
        value={filters.priority ?? ''}
        onChange={(event) =>
          onChange({ priority: PRIORITIES.find((p) => p === event.target.value) ?? null })
        }
        className="h-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm text-gray-700 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
      >
        <option value="">Mọi mức ưu tiên</option>
        {PRIORITIES.map((priority) => (
          <option key={priority} value={priority}>
            {PRIORITY_META[priority].label}
          </option>
        ))}
      </select>
      {hasFilters(filters) && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          <Icon name="filterX" size={16} />
          Xoá lọc
        </Button>
      )}
    </div>
  );
}

interface FilterChipProps {
  isOn: boolean;
  onClick: () => void;
  children: ReactNode;
}

function FilterChip({ isOn, onClick, children }: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={isOn}
      onClick={onClick}
      className={cn(
        'inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        isOn
          ? 'border-primary-500 bg-primary-50 text-primary-800'
          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50',
      )}
    >
      {children}
    </button>
  );
}
