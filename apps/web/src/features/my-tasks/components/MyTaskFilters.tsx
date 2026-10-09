import { SearchInput, Select } from '@/components/ui';
import { useDepartmentOptions } from '@/features/departments';
import { PRIORITIES, PRIORITY_META } from '@/features/tasks';
import type { MyTaskParams } from '../types';
import { ProjectFilter } from './ProjectFilter';

type FilterChanges = Partial<Record<'department' | 'priority' | 'project' | 'q', string>>;

interface MyTaskFiltersProps {
  params: MyTaskParams;
  /** Đổi bộ lọc → về trang 1 (trang gọi updateParams kèm page: null). */
  onChange: (changes: FilterChanges) => void;
}

/** Bộ lọc trên URL: phòng ban (Dashboard), ưu tiên, dự án; ô tìm theo tên việc. */
export function MyTaskFilters({ params, onChange }: MyTaskFiltersProps) {
  const departments = useDepartmentOptions();
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SearchInput
        label="Tìm việc"
        placeholder="Tìm theo tên việc"
        value={params.q}
        onSearch={(q) => onChange({ q })}
      />
      <Select
        label="Lọc theo phòng ban"
        hideLabel
        placeholder="Mọi phòng ban"
        options={(departments.data ?? []).map((department) => ({
          value: department.id,
          label: department.name,
        }))}
        value={params.departmentId}
        onChange={(event) => onChange({ department: event.target.value })}
      />
      <Select
        label="Lọc theo ưu tiên"
        hideLabel
        placeholder="Mọi mức ưu tiên"
        options={PRIORITIES.map((priority) => ({
          value: priority,
          label: PRIORITY_META[priority].label,
        }))}
        value={params.priority}
        onChange={(event) => onChange({ priority: event.target.value })}
      />
      <ProjectFilter projectId={params.projectId} onChange={(project) => onChange({ project })} />
    </div>
  );
}
