import { Button, SearchInput } from '@/components/ui';

interface OrgChartToolbarProps {
  query: string;
  onSearch: (query: string) => void;
  /** Số người khớp ô tìm kiếm. */
  matchCount: number;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

/** Tìm người (tên / chức danh) + mở rộng / thu gọn mọi phòng. */
export function OrgChartToolbar({ query, onSearch, matchCount, ...actions }: OrgChartToolbarProps) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="sm:w-80">
        <SearchInput
          label="Tìm người"
          placeholder="Tìm theo tên hoặc chức danh"
          value={query}
          onSearch={onSearch}
        />
        {query.trim() && (
          <p role="status" className="mt-1 text-sm text-gray-600">
            {matchCount > 0 ? `Tìm thấy ${matchCount} người` : 'Không có ai khớp'}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={actions.onExpandAll}>
          Mở rộng tất cả
        </Button>
        <Button variant="secondary" size="sm" onClick={actions.onCollapseAll}>
          Thu gọn tất cả
        </Button>
      </div>
    </div>
  );
}
