import { Link } from 'react-router-dom';
import { Badge, type BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';

interface CountCellProps {
  value: number;
  /** Board đã lọc; null hoặc số 0 → chỉ hiện số (không có gì để mở). */
  href: string | null;
  tone: BadgeTone | null;
  label: string;
}

/** Một con số của bảng: bấm → board phòng đó lọc theo người và nhóm việc. */
export function CountCell({ value, href, tone, label }: CountCellProps) {
  const content = tone ? <Badge tone={tone}>{value}</Badge> : value;
  if (!href || value === 0) {
    return <span className={cn('tabular-nums', value === 0 && 'text-gray-400')}>{content}</span>;
  }
  return (
    <Link
      to={href}
      aria-label={`${label}: ${value} — mở trên board`}
      className="tabular-nums font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
    >
      {content}
    </Link>
  );
}

interface OpenLoadBarProps {
  open: number;
  /** Số việc đang mở lớn nhất trên trang — thanh dài nhất. */
  max: number;
  isOverloaded: boolean;
}

/** Thanh ngang tổng việc đang mở, so với người nhiều việc nhất trên trang (frontend-spec 4.6 — BarList). */
export function OpenLoadBar({ open, max, isOverloaded }: OpenLoadBarProps) {
  const percent = max > 0 ? Math.round((open / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="w-6 text-right tabular-nums">{open}</span>
      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
        <div
          className={cn('h-full rounded-full', isOverloaded ? 'bg-warning-500' : 'bg-primary-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
