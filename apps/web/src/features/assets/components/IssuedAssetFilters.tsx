import { SearchInput, Select } from '@/components/ui';
import {
  ASSET_CATEGORY_LABELS,
  ASSET_HOLDER_LABELS,
  ASSET_STATUS_META,
} from '../issued-assets.utils';
import {
  ASSET_HOLDER_TYPES,
  ISSUED_ASSET_CATEGORIES,
  ISSUED_ASSET_STATUSES,
  type IssuedAssetParams,
} from '../types';

type FilterChanges = Partial<Record<'q' | 'category' | 'status' | 'holder', string>>;

interface IssuedAssetFiltersProps {
  params: IssuedAssetParams;
  /** Đổi bộ lọc → về trang 1 (nơi gọi xoá `page`). */
  onChange: (changes: FilterChanges) => void;
}

/** Bộ lọc trên URL: tìm theo tên / mã, loại, trạng thái, đối tượng sử dụng. */
export function IssuedAssetFilters({ params, onChange }: IssuedAssetFiltersProps) {
  return (
    <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <SearchInput
        label="Tìm tài sản"
        placeholder="Tìm theo tên hoặc mã"
        value={params.q}
        onSearch={(q) => onChange({ q })}
      />
      <Select
        label="Lọc theo loại"
        hideLabel
        placeholder="Mọi loại"
        options={ISSUED_ASSET_CATEGORIES.map((category) => ({
          value: category,
          label: ASSET_CATEGORY_LABELS[category],
        }))}
        value={params.category}
        onChange={(event) => onChange({ category: event.target.value })}
      />
      <Select
        label="Lọc theo trạng thái"
        hideLabel
        placeholder="Mọi trạng thái"
        options={ISSUED_ASSET_STATUSES.map((status) => ({
          value: status,
          label: ASSET_STATUS_META[status].label,
        }))}
        value={params.status}
        onChange={(event) => onChange({ status: event.target.value })}
      />
      <Select
        label="Lọc theo đối tượng sử dụng"
        hideLabel
        placeholder="Mọi đối tượng"
        options={ASSET_HOLDER_TYPES.map((type) => ({
          value: type,
          label: ASSET_HOLDER_LABELS[type],
        }))}
        value={params.holderType}
        onChange={(event) => onChange({ holder: event.target.value })}
      />
    </div>
  );
}
