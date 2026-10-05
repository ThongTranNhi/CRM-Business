import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useDeleteEmployee, useRestoreEmployee } from '../hooks/useEmployeeMutations';
import type { DirectoryEmployee } from '../types';
import { EmployeePicker, type PickedEmployee } from './EmployeePicker';

interface DeleteEmployeeDialogProps {
  employee: DirectoryEmployee;
  onClose: () => void;
}

/**
 * BR-53: xoá mềm — khoá tài khoản, thu hồi phiên, ẩn khỏi danh sách và ô chọn người.
 * Bàn giao việc đang mở bổ sung ở Đợt 2 (khi có bảng tasks).
 */
export function DeleteEmployeeDialog({ employee, onClose }: DeleteEmployeeDialogProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [newManager, setNewManager] = useState<PickedEmployee | null>(null);
  const remove = useDeleteEmployee(employee.id);
  const { restore } = useRestoreEmployee();
  const managed = employee.managedDepartment;

  async function handleConfirm() {
    try {
      await remove.mutateAsync(newManager?.id ?? null);
      navigate('/app/employees', { replace: true });
      toast({
        message: `Đã xoá nhân viên ${employee.fullName}`,
        action: { label: 'Hoàn tác', onClick: () => void restore(employee.id) },
      });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title={`Xoá nhân viên ${employee.fullName}?`}
      confirmLabel="Xoá nhân viên"
      loading={remove.isPending}
      onConfirm={handleConfirm}
      description={
        <p>
          Tài khoản bị khoá và mọi phiên đăng nhập bị thu hồi ngay. Hồ sơ ẩn khỏi danh sách và ô
          chọn người; lịch sử được giữ nguyên. Có thể khôi phục ở bộ lọc "Đã xoá".
        </p>
      }
    >
      {managed && (
        <>
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-warning-800">
            {employee.fullName} đang là trưởng phòng {managed.name}. Phòng này sẽ chưa có trưởng
            phòng nếu không chọn người thay.
          </p>
          <EmployeePicker
            label={`Trưởng phòng mới cho ${managed.name} (tuỳ chọn)`}
            value={newManager}
            onChange={setNewManager}
            excludeIds={[employee.id]}
          />
        </>
      )}
    </ConfirmDialog>
  );
}
