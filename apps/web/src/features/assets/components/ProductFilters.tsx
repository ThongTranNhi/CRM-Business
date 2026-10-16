import { SearchInput, Select } from '@/components/ui';
import { useDepartmentOptions } from '@/features/departments';
import { PRODUCT_STATUS_META } from '../assets.utils';
import { PRODUCT_STATUSES, type ProductParams } from '../types';

type FilterChanges = Partial<Record<'q' | 'department' | 'status', string>>;

interface ProductFiltersProps {
  params: ProductParams;
  /** Đổi bộ lọc → về trang 1 (nơi gọi xoá `page`). */
  onChange: (changes: FilterChanges) => void;
}

/** Bộ lọc trên URL: tìm theo tên, phòng ban, trạng thái. */
export function ProductFilters({ params, onChange }: ProductFiltersProps) {
  const departments = useDepartmentOptions();
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <SearchInput
        label="Tìm sản phẩm"
        placeholder="Tìm theo tên sản phẩm"
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
        label="Lọc theo trạng thái"
        hideLabel
        placeholder="Mọi trạng thái"
        options={PRODUCT_STATUSES.map((status) => ({
          value: status,
          label: PRODUCT_STATUS_META[status].label,
        }))}
        value={params.status}
        onChange={(event) => onChange({ status: event.target.value })}
      />
    </div>
  );
}
