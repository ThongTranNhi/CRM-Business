import { Link } from 'react-router-dom';
import { Badge, EmptyState } from '@/components/ui';
import type { OverloadedEmployee } from '../types';

interface OverloadedListProps {
  employees: OverloadedEmployee[];
}

/** "Nhân viên quá tải / nhiều việc quá hạn" (tối đa 5): bấm → Khối lượng việc, người nhiều việc quá hạn trước. */
export function OverloadedList({ employees }: OverloadedListProps) {
  if (employees.length === 0) {
    return <EmptyState icon="users" title="Không ai quá tải hay có việc quá hạn" />;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {employees.map((row) => (
        <li key={row.employee.id}>
          <Link
            to="/app/workload?sort=overdue"
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">
                {row.employee.fullName}
              </span>
              <span className="block truncate text-xs text-gray-500">
                {row.department?.name ?? 'Chưa có phòng ban'} · {row.open} việc đang mở
              </span>
            </span>
            {row.overdue > 0 && <Badge tone="danger">{row.overdue} quá hạn</Badge>}
          </Link>
        </li>
      ))}
    </ul>
  );
}
