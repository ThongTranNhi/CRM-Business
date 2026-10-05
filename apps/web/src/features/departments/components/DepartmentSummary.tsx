import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '@/components/ui';
import { useCan } from '@/features/auth';
import type { DepartmentDetail } from '../types';
import { DashboardAction } from './DashboardAction';
import { ManagerCell } from './ManagerCell';

interface DepartmentSummaryProps {
  department: DepartmentDetail;
  /** Mở hộp thoại sửa để chọn trưởng phòng (khi phòng chưa có trưởng phòng). */
  onPickManager: () => void;
}

export function DepartmentSummary({ department, onPickManager }: DepartmentSummaryProps) {
  const canDo = useCan();
  const canManage = canDo('departments.manage');
  const linkClass = 'text-sm font-medium text-primary-700 hover:underline';

  return (
    <Card className="p-5">
      <dl className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryItem label="Trưởng phòng">
          <div className="flex flex-wrap items-center gap-2">
            <ManagerCell manager={department.manager} />
            {!department.manager && canManage && (
              <Button variant="secondary" size="sm" onClick={onPickManager}>
                Chọn trưởng phòng
              </Button>
            )}
          </div>
        </SummaryItem>
        <SummaryItem label="Số nhân viên">{department.memberCount}</SummaryItem>
        <SummaryItem label="Dashboard">
          <DashboardAction department={department} />
        </SummaryItem>
        <SummaryItem label="Liên kết">
          <div className="flex flex-col gap-1">
            <Link to={`/app/projects?department=${department.id}`} className={linkClass}>
              Dự án của phòng
            </Link>
            <Link
              to={`/app/kpi?level=department&department=${department.id}`}
              className={linkClass}
            >
              KPI phòng
            </Link>
          </div>
        </SummaryItem>
      </dl>
    </Card>
  );
}

interface SummaryItemProps {
  label: string;
  children: ReactNode;
}

function SummaryItem({ label, children }: SummaryItemProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1.5 text-sm text-gray-900">{children}</dd>
    </div>
  );
}
