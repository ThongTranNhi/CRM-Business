import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, ErrorState, Icon, PageHeader, Skeleton } from '@/components/ui';
import { useCan, useCurrentUser } from '@/features/auth';
import { DeleteEmployeeDialog } from '../components/DeleteEmployeeDialog';
import { EmployeeAdminForm } from '../components/EmployeeAdminForm';
import { EmployeeProfileCard } from '../components/EmployeeProfileCard';
import { ResetPasswordForm } from '../components/ResetPasswordForm';
import { RestoreEmployeeButton } from '../components/RestoreEmployeeButton';
import { useEmployeeDetail } from '../hooks/useDirectory';
import type { EmployeeDetail } from '../types';

export function EmployeeDetailPage() {
  const { id = '' } = useParams();
  const { employee, departments } = useEmployeeDetail(id);

  if (employee.isPending || departments.isPending) return <Skeleton className="h-72 w-full" />;
  if (employee.isError || departments.isError) {
    return (
      <ErrorState
        message={employee.error?.message ?? departments.error?.message}
        onRetry={() => {
          void employee.refetch();
          void departments.refetch();
        }}
      />
    );
  }
  return <EmployeeProfile employee={employee.data} departments={departments.data} />;
}

interface EmployeeProfileProps {
  employee: EmployeeDetail;
  departments: { id: string; name: string }[];
}

function EmployeeProfile({ employee, departments }: EmployeeProfileProps) {
  const canDo = useCan();
  const { data: currentUser } = useCurrentUser();
  const [deleting, setDeleting] = useState(false);
  const isDeleted = employee.archivedAt !== null;
  const isAdmin = employee.role === 'super_admin';
  // BR-53: không xoá được chính mình và Super Admin khác.
  const canDelete =
    canDo('employees.manage') && !isDeleted && !isAdmin && currentUser?.employeeId !== employee.id;

  return (
    <>
      <PageHeader
        title={employee.fullName}
        breadcrumbs={[{ label: 'Nhân viên', to: '/app/employees' }]}
        actions={
          <>
            {isDeleted && canDo('employees.manage') && (
              <RestoreEmployeeButton employeeId={employee.id} />
            )}
            {canDelete && (
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Icon name="trash" size={18} />
                Xoá nhân viên
              </Button>
            )}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <EmployeeProfileCard employee={employee} />
        <Card className="space-y-6 p-5">
          <ProfileManagement employee={employee} departments={departments} />
        </Card>
      </div>
      {deleting && <DeleteEmployeeDialog employee={employee} onClose={() => setDeleting(false)} />}
    </>
  );
}

function ProfileManagement({ employee, departments }: EmployeeProfileProps) {
  if (employee.archivedAt) {
    return (
      <p className="text-sm text-gray-600">
        Hồ sơ đã bị xoá: tài khoản bị khoá và ẩn khỏi danh sách. Bấm [Khôi phục] để mở lại.
      </p>
    );
  }
  if (employee.role === 'super_admin') {
    return (
      <p className="text-sm text-gray-600">
        Tài khoản quản trị. Không sửa hoặc đặt lại mật khẩu bằng luồng nhân viên.
      </p>
    );
  }
  return (
    <>
      <EmployeeAdminForm
        key={`${employee.id}:${employee.status}:${employee.departmentId}`}
        employee={employee}
        departments={departments}
      />
      {employee.username && employee.status === 'active' && (
        <ResetPasswordForm employeeId={employee.id} username={employee.username} />
      )}
    </>
  );
}
