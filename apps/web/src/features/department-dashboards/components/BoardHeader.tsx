import { AvatarGroup, Button, Icon, PageHeader } from '@/components/ui';
import { useCan } from '@/features/auth';
import type { DashboardDetail } from '../types';

interface BoardHeaderProps {
  dashboard: DashboardDetail;
  /** null: người xem không tạo được task (chỉ xem) → ẩn nút. */
  onAddTask: (() => void) | null;
}

/** Breadcrumb Workspace › Phòng ban, tên Dashboard, thành viên, [+ Thêm công việc]. */
export function BoardHeader({ dashboard, onAddTask }: BoardHeaderProps) {
  const canDo = useCan();
  // Bấm avatar → hồ sơ (frontend-spec mục 6); không có quyền xem nhân viên thì chỉ hiện tên khi rê chuột.
  const hrefOf = canDo('employees.view') ? (id: string) => `/app/employees/${id}` : undefined;
  return (
    <PageHeader
      title={dashboard.name}
      description={dashboard.description ?? undefined}
      breadcrumbs={[
        { label: 'Workspace', to: '/app/workspace' },
        { label: dashboard.department.name, to: `/app/departments/${dashboard.department.id}` },
      ]}
      actions={
        <>
          {dashboard.members.length > 0 && (
            <AvatarGroup people={dashboard.members} max={5} hrefOf={hrefOf} />
          )}
          {onAddTask && (
            <Button onClick={onAddTask}>
              <Icon name="plus" size={18} />
              Thêm công việc
            </Button>
          )}
        </>
      }
    />
  );
}
