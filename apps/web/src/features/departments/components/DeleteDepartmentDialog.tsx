import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog, Select, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useDepartmentOptions } from '../hooks/useDepartments';
import { useDeleteDepartment } from '../hooks/useDepartmentMutations';
import type { Department } from '../types';

interface DeleteDepartmentDialogProps {
  department: Department;
  onClose: () => void;
}

/**
 * BR-09: chỉ Super Admin; xoá mềm. Phòng còn nhân viên thì bắt buộc chọn phòng nhận,
 * toàn bộ nhân viên (kể cả trưởng phòng) được chuyển trong cùng một giao dịch.
 */
export function DeleteDepartmentDialog({ department, onClose }: DeleteDepartmentDialogProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [receivingId, setReceivingId] = useState('');
  const options = useDepartmentOptions();
  const remove = useDeleteDepartment(department.id);
  const needsReceiving = department.memberCount > 0;
  const receivingOptions = (options.data ?? [])
    .filter((option) => option.id !== department.id)
    .map((option) => ({ value: option.id, label: option.name }));

  async function handleConfirm() {
    try {
      await remove.mutateAsync(needsReceiving ? receivingId : null);
      toast({ message: 'Đã xoá phòng ban' });
      navigate('/app/departments', { replace: true });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title={`Xoá phòng ban ${department.name}?`}
      confirmLabel="Xoá phòng ban"
      loading={remove.isPending}
      confirmDisabled={needsReceiving && !receivingId}
      onConfirm={handleConfirm}
      description={
        <p>
          Phòng ban bị ẩn khỏi mọi danh sách và ô chọn; dự án, công việc và lịch sử được giữ nguyên.
          Super Admin có thể khôi phục ở bộ lọc "Đã xoá".
        </p>
      }
    >
      {needsReceiving && (
        <>
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-warning-800">
            {department.memberCount} nhân viên (kể cả trưởng phòng) sẽ được chuyển sang phòng nhận.
            Trưởng phòng hiện tại trở thành nhân viên thường ở phòng nhận.
          </p>
          <Select
            label="Phòng nhận"
            placeholder="Chọn phòng nhận"
            options={receivingOptions}
            value={receivingId}
            onChange={(event) => setReceivingId(event.target.value)}
            disabled={options.isPending}
            error={options.isError ? 'Không tải được danh sách phòng ban' : undefined}
          />
        </>
      )}
    </ConfirmDialog>
  );
}
