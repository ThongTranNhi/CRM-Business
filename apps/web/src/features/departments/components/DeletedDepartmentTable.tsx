import { Button, Icon, Table, useToast, type TableColumn } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/format-date';
import { useRestoreDepartment } from '../hooks/useDepartmentMutations';
import type { Department } from '../types';

const COLUMNS: TableColumn<Department>[] = [
  { key: 'name', header: 'Phòng ban', render: (department) => department.name },
  {
    key: 'archivedAt',
    header: 'Ngày xoá',
    render: (department) =>
      department.archivedAt ? formatDate(new Date(department.archivedAt)) : '',
  },
  {
    key: 'actions',
    header: 'Thao tác',
    className: 'text-right',
    render: (department) => <RestoreButton department={department} />,
  },
];

interface DeletedDepartmentTableProps {
  departments: Department[];
}

/** Bộ lọc "Đã xoá" (chỉ Super Admin, BR-09): khôi phục phòng ban, không kèm trưởng phòng. */
export function DeletedDepartmentTable({ departments }: DeletedDepartmentTableProps) {
  return (
    <Table
      caption="Danh sách phòng ban đã xoá"
      columns={COLUMNS}
      rows={departments}
      getRowKey={(department) => department.id}
    />
  );
}

interface RestoreButtonProps {
  department: Department;
}

function RestoreButton({ department }: RestoreButtonProps) {
  const toast = useToast();
  const restore = useRestoreDepartment();

  async function handleRestore() {
    try {
      await restore.mutateAsync(department.id);
      toast({ message: `Đã khôi phục phòng ban ${department.name}` });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <Button variant="secondary" size="sm" loading={restore.isPending} onClick={handleRestore}>
      <Icon name="restore" size={16} />
      Khôi phục
    </Button>
  );
}
