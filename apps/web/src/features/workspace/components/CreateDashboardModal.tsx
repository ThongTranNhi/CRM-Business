import { useState } from 'react';
import { ErrorState, Modal, Skeleton } from '@/components/ui';
import { useCan } from '@/features/auth';
import { DepartmentForm } from '@/features/departments';
import { useCreatableDepartments } from '../hooks/useCreatableDepartments';
import type { DepartmentOption } from '../types';
import { CreateDashboardForm } from './CreateDashboardForm';

interface CreateDashboardModalProps {
  open: boolean;
  /** `?createFor=<departmentId>`: chọn sẵn phòng này. */
  initialDepartmentId: string | null;
  onClose: () => void;
}

export function CreateDashboardModal({
  open,
  initialDepartmentId,
  onClose,
}: CreateDashboardModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Tạo Dashboard">
      <CreateDashboardSteps initialDepartmentId={initialDepartmentId} onClose={onClose} />
    </Modal>
  );
}

interface CreateDashboardStepsProps {
  initialDepartmentId: string | null;
  onClose: () => void;
}

/**
 * Bước "Tạo phòng ban mới" dùng lại DepartmentForm (chỉ tạo phòng ban — BR-02); lưu xong quay lại
 * bước Dashboard với phòng mới chọn sẵn. Mọi phòng đã có Dashboard → mở sẵn bước tạo phòng ban.
 */
function CreateDashboardSteps({ initialDepartmentId, onClose }: CreateDashboardStepsProps) {
  const canDo = useCan();
  const canCreateDepartment = canDo('departments.manage');
  const [created, setCreated] = useState<DepartmentOption | null>(null);
  // 'auto': tự mở bước tạo phòng ban khi không còn phòng nào để tạo Dashboard.
  const [step, setStep] = useState<'auto' | 'department' | 'dashboard'>('auto');
  const { options, isPending, isError, refetch } = useCreatableDepartments(created);

  if (isPending) return <Skeleton className="h-48 w-full" />;
  if (isError) return <ErrorState onRetry={() => void refetch()} />;
  const isAutoDepartmentStep = step === 'auto' && canCreateDepartment && options.length === 0;
  if (step === 'department' || isAutoDepartmentStep) {
    return (
      <div className="space-y-4">
        {options.length === 0 && (
          <p className="text-sm text-gray-600">
            Mọi phòng ban hiện có đều đã có Dashboard. Tạo phòng ban mới để tiếp tục.
          </p>
        )}
        <DepartmentForm
          onCreated={(department) =>
            setCreated({ id: department.id, name: department.name, isNew: true })
          }
          onDone={() => setStep('dashboard')}
        />
      </div>
    );
  }
  return (
    <CreateDashboardForm
      options={options}
      initialDepartmentId={created?.id ?? initialDepartmentId}
      onNewDepartment={canCreateDepartment ? () => setStep('department') : null}
      onCancel={onClose}
    />
  );
}
