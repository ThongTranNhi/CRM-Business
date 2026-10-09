import type { ReactNode } from 'react';
import { Button, Icon, SearchInput, Select } from '@/components/ui';
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
  /** Dự án của phòng; rỗng → ẩn ô lọc dự án. */
  projects: { id: string; name: string }[];
  onChange: (changes: Partial<Filters>) => void;
  onClear: () => void;
}

/** Thanh lọc board (department-dashboard.md): tên / người phụ trách, Việc của tôi, hạn, ưu tiên, dự án. */
export function BoardFilters({ filters, projects, onChange, onClear }: BoardFiltersProps) {
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
      <div className="w-44">
        <Select
          label="Lọc theo ưu tiên"
          hideLabel
          placeholder="Mọi mức ưu tiên"
          options={PRIORITIES.map((priority) => ({
            value: priority,
            label: PRIORITY_META[priority].label,
          }))}
          value={filters.priority ?? ''}
          onChange={(event) =>
            onChange({ priority: PRIORITIES.find((p) => p === event.target.value) ?? null })
          }
        />
      </div>
      {projects.length > 0 && (
        <div className="w-48">
          <Select
            label="Lọc theo dự án"
            hideLabel
            placeholder="Mọi dự án"
            options={projects.map((project) => ({ value: project.id, label: project.name }))}
            value={filters.project ?? ''}
            onChange={(event) => onChange({ project: event.target.value || null })}
          />
        </div>
      )}
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
