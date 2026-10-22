import { Link } from 'react-router-dom';
import { EmptyState } from '@/components/ui';
import { cn } from '@/lib/cn';
import { segmentWidths, taskTotal } from '../executive.utils';
import type { DepartmentTaskStats } from '../types';

// Màu theo docs/ui-ux/colors.md (Cần làm gray · Đang làm info · Đã hoàn thành success); bậc màu chọn bằng bộ kiểm
// tra bảng màu (dataviz) để ba đoạn đủ tách nhau, kể cả với người mù màu. Số luôn hiện bằng chữ dưới thanh.
const SEGMENTS = [
  { key: 'todo', label: 'Cần làm', className: 'bg-gray-400' },
  { key: 'inProgress', label: 'Đang làm', className: 'bg-info-700' },
  { key: 'done', label: 'Hoàn thành', className: 'bg-success-400' },
] as const;

interface DepartmentTaskChartProps {
  departments: DepartmentTaskStats[];
}

/** "Công việc theo phòng ban": thanh chồng 3 trạng thái, so với phòng nhiều việc nhất; bấm phòng → Dashboard. */
export function DepartmentTaskChart({ departments }: DepartmentTaskChartProps) {
  if (departments.length === 0) {
    return <EmptyState icon="barChart" title="Chưa có việc nào được tạo trong kỳ này" />;
  }
  const maxTotal = Math.max(...departments.map(taskTotal));
  return (
    <div className="space-y-4 p-4">
      <ul className="flex flex-wrap gap-4 text-xs text-gray-600" aria-label="Chú thích">
        {SEGMENTS.map((segment) => (
          <li key={segment.key} className="flex items-center gap-1.5">
            <span className={cn('size-2.5 rounded-sm', segment.className)} aria-hidden />
            {segment.label}
          </li>
        ))}
      </ul>
      <ul className="space-y-3">
        {departments.map((row) => (
          <DepartmentBar key={row.department.id} row={row} maxTotal={maxTotal} />
        ))}
      </ul>
    </div>
  );
}

interface DepartmentBarProps {
  row: DepartmentTaskStats;
  maxTotal: number;
}

function DepartmentBar({ row, maxTotal }: DepartmentBarProps) {
  const widths = segmentWidths(row, maxTotal);
  const summary = SEGMENTS.map((segment) => `${row[segment.key]} ${segment.label.toLowerCase()}`);
  return (
    <li>
      <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
        {row.dashboardId ? (
          <Link
            to={`/app/workspace/${row.dashboardId}`}
            className="truncate font-medium text-gray-900 hover:underline"
          >
            {row.department.name}
          </Link>
        ) : (
          <span className="truncate font-medium text-gray-900">{row.department.name}</span>
        )}
        <span className="shrink-0 tabular-nums text-gray-500">{taskTotal(row)} việc</span>
      </div>
      <div
        className="flex h-2.5 gap-0.5"
        role="img"
        aria-label={`${row.department.name}: ${summary.join(', ')}`}
      >
        {SEGMENTS.map((segment) =>
          row[segment.key] > 0 ? (
            <span
              key={segment.key}
              title={`${segment.label}: ${row[segment.key]}`}
              className={cn('h-full rounded', segment.className)}
              style={{ width: `${widths[segment.key]}%` }}
            />
          ) : null,
        )}
      </div>
      <p className="mt-1 text-xs tabular-nums text-gray-500">
        {summary.join(' · ')}
        {row.overdue > 0 && <span className="text-danger-700"> · {row.overdue} quá hạn</span>}
      </p>
    </li>
  );
}
