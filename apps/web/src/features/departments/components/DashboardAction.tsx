import { Badge, ButtonLink, Icon } from '@/components/ui';
import { useCan } from '@/features/auth';
import type { Department } from '../types';

interface DashboardActionProps {
  department: Department;
}

/**
 * Cột Dashboard (frontend-spec 4.10): Đã có → [Mở Dashboard]; Chưa có → [Tạo Dashboard] mở Workspace
 * với phòng chọn sẵn (BR-05). Người không tạo được thấy ai cần tạo khi phòng chưa có trưởng phòng.
 */
export function DashboardAction({ department }: DashboardActionProps) {
  const canDo = useCan();
  if (department.dashboardId) {
    return (
      <span className="flex flex-wrap items-center gap-2">
        <Badge tone="success">Đã có</Badge>
        <ButtonLink to={`/app/workspace/${department.dashboardId}`} variant="secondary" size="sm">
          Mở Dashboard
        </ButtonLink>
      </span>
    );
  }
  if (canDo('dashboards.create', { departmentId: department.id })) {
    return (
      <ButtonLink to={`/app/workspace?createFor=${department.id}`} variant="secondary" size="sm">
        <Icon name="plus" size={16} />
        Tạo Dashboard
      </ButtonLink>
    );
  }
  return (
    <span className="flex flex-col items-start gap-1">
      <Badge>Chưa có</Badge>
      {!department.manager && (
        <span className="text-xs text-gray-500">Cần CEO hoặc trưởng phòng tạo</span>
      )}
    </span>
  );
}
