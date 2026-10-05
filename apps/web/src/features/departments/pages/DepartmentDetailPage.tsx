import { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Skeleton,
} from '@/components/ui';
import { useCan } from '@/features/auth';
import { hasErrorCode } from '@/lib/api-client';
import { DeleteDepartmentDialog } from '../components/DeleteDepartmentDialog';
import { DepartmentFormModal } from '../components/DepartmentFormModal';
import { DepartmentMembers } from '../components/DepartmentMembers';
import { DepartmentSummary } from '../components/DepartmentSummary';
import { useDepartment } from '../hooks/useDepartments';
import type { DepartmentDetail } from '../types';

export function DepartmentDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError, error, refetch } = useDepartment(id);

  if (isPending) return <Skeleton className="h-72 w-full" />;
  if (isError && hasErrorCode(error, 'DEPARTMENT_NOT_FOUND')) {
    return (
      <>
        <PageHeader title="Không tìm thấy phòng ban" />
        <EmptyState
          icon="building"
          title="Phòng ban không tồn tại hoặc đã bị xoá"
          action={<ButtonLink to="/app/departments">Về danh sách phòng ban</ButtonLink>}
        />
      </>
    );
  }
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  return <DepartmentDetailView department={data} />;
}

interface DepartmentDetailViewProps {
  department: DepartmentDetail;
}

function DepartmentDetailView({ department }: DepartmentDetailViewProps) {
  const canDo = useCan();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  return (
    <>
      <PageHeader
        title={department.name}
        breadcrumbs={[{ label: 'Phòng ban', to: '/app/departments' }]}
        actions={
          <>
            {canDo('departments.manage') && (
              <Button variant="secondary" onClick={() => setEditing(true)}>
                <Icon name="edit" size={18} />
                Sửa
              </Button>
            )}
            {canDo('departments.delete') && (
              <Button variant="danger" onClick={() => setDeleting(true)}>
                <Icon name="trash" size={18} />
                Xoá phòng ban
              </Button>
            )}
          </>
        }
      />
      <div className="space-y-6">
        <DepartmentSummary department={department} onPickManager={() => setEditing(true)} />
        <DepartmentMembers department={department} />
      </div>
      <DepartmentFormModal
        open={editing}
        onClose={() => setEditing(false)}
        department={department}
      />
      {deleting && (
        <DeleteDepartmentDialog department={department} onClose={() => setDeleting(false)} />
      )}
    </>
  );
}
