import { Button } from './Button';
import { Icon } from './Icon';

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: PaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  if (pageCount === 1) return null;
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav aria-label="Phân trang" className="mt-4 flex items-center justify-between gap-3 text-sm">
      <p className="text-gray-500">
        {first}–{last} / {total}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
        >
          <Icon name="chevronLeft" size={16} />
          Trước
        </Button>
        <span className="text-gray-700">
          Trang {page}/{pageCount}
        </span>
        <Button
          variant="secondary"
          size="sm"
          disabled={page >= pageCount}
          onClick={() => onChange(page + 1)}
        >
          Sau
          <Icon name="chevronRight" size={16} />
        </Button>
      </div>
    </nav>
  );
}
