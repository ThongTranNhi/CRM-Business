import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Avatar, Badge, Card } from '@/components/ui';
import { employeeStatusBadge } from '../employees.utils';
import type { DirectoryEmployee } from '../types';

interface EmployeeProfileCardProps {
  employee: DirectoryEmployee;
}

export function EmployeeProfileCard({ employee }: EmployeeProfileCardProps) {
  const badge = employeeStatusBadge(employee);
  return (
    <Card className="p-5">
      <div className="mb-5 flex items-center gap-4">
        <Avatar name={employee.fullName} src={employee.avatarUrl} size="lg" />
        <div>
          <p className="font-semibold text-gray-900">{employee.fullName}</p>
          <Badge tone={badge.tone}>{badge.label}</Badge>
        </div>
      </div>
      <dl className="grid gap-4 text-sm sm:grid-cols-2">
        <Field label="Username">{employee.username ?? 'Đăng nhập Google'}</Field>
        <Field label="Mã nhân viên">{employee.employeeCode ?? 'Chưa cập nhật'}</Field>
        <Field label="Chức vụ">{employee.jobTitle ?? 'Chưa gán'}</Field>
        <Field label="Phòng ban">
          {employee.departmentId && !employee.archivedAt ? (
            <Link
              to={`/app/departments/${employee.departmentId}`}
              className="text-primary-700 hover:underline"
            >
              {employee.departmentName}
            </Link>
          ) : (
            (employee.departmentName ?? 'Chưa gán')
          )}
        </Field>
        <Field label="Người quản lý">{employee.managerName ?? 'Chưa có'}</Field>
        {employee.managedDepartment && (
          <Field label="Đang là trưởng phòng">{employee.managedDepartment.name}</Field>
        )}
      </dl>
    </Card>
  );
}

interface FieldProps {
  label: string;
  children: ReactNode;
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-1 text-gray-900">{children}</dd>
    </div>
  );
}
