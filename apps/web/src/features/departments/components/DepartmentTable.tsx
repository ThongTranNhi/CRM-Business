import { Link } from 'react-router-dom';
import { Table, type TableColumn } from '@/components/ui';
import type { Department } from '../types';
import { DashboardAction } from './DashboardAction';
import { ManagerCell } from './ManagerCell';

const COLUMNS: TableColumn<Department>[] = [
  {
    key: 'name',
    header: 'Phòng ban',
    render: (department) => (
      <Link
        to={`/app/departments/${department.id}`}
        className="font-medium text-gray-900 hover:text-primary-700 hover:underline"
      >
        {department.name}
      </Link>
    ),
  },
  {
    key: 'manager',
    header: 'Trưởng phòng',
    render: (department) => <ManagerCell manager={department.manager} />,
  },
  {
    key: 'members',
    header: 'Nhân viên',
    className: 'text-right',
    render: (department) => department.memberCount,
  },
  {
    key: 'dashboard',
    header: 'Dashboard',
    render: (department) => <DashboardAction department={department} />,
  },
];

interface DepartmentTableProps {
  departments: Department[];
}

export function DepartmentTable({ departments }: DepartmentTableProps) {
  return (
    <Table
      caption="Danh sách phòng ban đang hoạt động"
      columns={COLUMNS}
      rows={departments}
      getRowKey={(department) => department.id}
    />
  );
}
