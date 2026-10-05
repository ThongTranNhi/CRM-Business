import { Link } from 'react-router-dom';
import { Avatar, Badge, Table, type TableColumn } from '@/components/ui';
import { employeeStatusBadge } from '../employees.utils';
import type { DirectoryEmployee } from '../types';

const COLUMNS: TableColumn<DirectoryEmployee>[] = [
  {
    key: 'name',
    header: 'Nhân viên',
    render: (employee) => (
      <div className="flex items-center gap-3">
        <Avatar name={employee.fullName} size="sm" />
        <div className="min-w-0">
          <Link
            to={`/app/employees/${employee.id}`}
            className="block truncate font-medium text-gray-900 hover:text-primary-700 hover:underline"
          >
            {employee.fullName}
          </Link>
          <span className="block truncate text-xs text-gray-500">
            {employee.username ?? 'Google'}
          </span>
        </div>
      </div>
    ),
  },
  { key: 'code', header: 'Mã NV', render: (employee) => employee.employeeCode ?? '—' },
  { key: 'jobTitle', header: 'Chức vụ', render: (employee) => employee.jobTitle ?? '—' },
  {
    key: 'department',
    header: 'Phòng ban',
    render: (employee) =>
      employee.departmentId && !employee.archivedAt ? (
        <Link
          to={`/app/departments/${employee.departmentId}`}
          className="text-primary-700 hover:underline"
        >
          {employee.departmentName}
        </Link>
      ) : (
        (employee.departmentName ?? 'Chưa gán')
      ),
  },
  { key: 'manager', header: 'Trưởng phòng', render: (employee) => employee.managerName ?? '—' },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (employee) => {
      const badge = employeeStatusBadge(employee);
      return <Badge tone={badge.tone}>{badge.label}</Badge>;
    },
  },
];

interface EmployeeTableProps {
  employees: DirectoryEmployee[];
}

export function EmployeeTable({ employees }: EmployeeTableProps) {
  return (
    <Table
      caption="Danh sách nhân viên"
      columns={COLUMNS}
      rows={employees}
      getRowKey={(employee) => employee.id}
    />
  );
}
