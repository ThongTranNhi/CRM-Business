import { Badge, ButtonLink, Icon } from '@/components/ui';
import { useCan } from '@/features/auth';
import type { Department } from '../types';

interface DashboardActionProps {
  department: Department;
}

/**
 * Cột Dashboard (frontend-spec 4.10). Bảng department_dashboards có từ Đợt 2; tới lúc đó mọi phòng
 * là "Chưa có" và [Tạo Dashboard] mở Workspace với phòng đã chọn sẵn.
 */
export function DashboardAction({ department }: DashboardActionProps) {
  const canDo = useCan();
  if (!canDo('dashboards.create', { departmentId: department.id })) return <Badge>Chưa có</Badge>;
  return (
    <ButtonLink to={`/app/workspace?createFor=${department.id}`} variant="secondary" size="sm">
      <Icon name="plus" size={16} />
      Tạo Dashboard
    </ButtonLink>
  );
}
