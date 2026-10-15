import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog, useToast } from '@/components/ui';
import { errorMessage, hasErrorCode } from '@/lib/api-client';
import { useDeleteEmployee, useRestoreEmployee } from '../hooks/useEmployeeMutations';
import { handedOverText, handoverScopeText } from '../employees.utils';
import type { EmployeeDetail } from '../types';
import { EmployeePicker, type PickedEmployee } from './EmployeePicker';

interface DeleteEmployeeDialogProps {
  employee: EmployeeDetail;
  onClose: () => void;
}

/** Lỗi gắn với ô người nhận bàn giao: hiện ngay dưới ô (kèm toast). */
const HANDOVER_ERRORS = [
  'HANDOVER_EMPLOYEE_NOT_IN_BOARD',
  'HANDOVER_EMPLOYEE_NOT_PROJECT_ELIGIBLE',
  'HANDOVER_EMPLOYEE_NOT_FOUND',
];

/**
 * BR-53: xoá mềm — khoá tài khoản, thu hồi phiên, ẩn khỏi danh sách và ô chọn người. Còn việc đang mở
 * hoặc đang làm chủ dự án thì chọn người nhận bàn giao (tuỳ chọn, mặc định người cùng phòng); bỏ qua →
 * việc / dự án giữ nguyên, hiện "Đã nghỉ".
 */
export function DeleteEmployeeDialog({ employee, onClose }: DeleteEmployeeDialogProps) {
  const navigate = useNavigate();
  const toast = useToast();
  const [newManager, setNewManager] = useState<PickedEmployee | null>(null);
  const [receiver, setReceiver] = useState<PickedEmployee | null>(null);
  const [handoverError, setHandoverError] = useState<string | null>(null);
  const remove = useDeleteEmployee(employee.id);
  const { restore } = useRestoreEmployee();
  const managed = employee.managedDepartment;

  async function handleConfirm() {
    try {
      const result = await remove.mutateAsync({
        newManagerId: newManager?.id ?? null,
        handoverEmployeeId: receiver?.id ?? null,
      });
      navigate('/app/employees', { replace: true });
      const handedOver = receiver ? handedOverText(result, receiver.fullName) : '';
      toast({
        message: `Đã xoá nhân viên ${employee.fullName}${handedOver}`,
        action: { label: 'Hoàn tác', onClick: () => void restore(employee.id) },
      });
    } catch (error) {
      if (HANDOVER_ERRORS.some((code) => hasErrorCode(error, code))) {
        setHandoverError(errorMessage(error));
      }
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
      {(employee.openTaskCount > 0 || employee.ownedProjectCount > 0) && (
        <HandoverSection
          employee={employee}
          receiver={receiver}
          error={handoverError}
          onChange={(person) => {
            setReceiver(person);
            setHandoverError(null);
          }}
        />
      )}
    </ConfirmDialog>
  );
}

interface HandoverSectionProps {
  employee: EmployeeDetail;
  receiver: PickedEmployee | null;
  error: string | null;
  onChange: (person: PickedEmployee | null) => void;
}

function HandoverSection({ employee, receiver, error, onChange }: HandoverSectionProps) {
  const department =
    employee.departmentId && employee.departmentName
      ? { id: employee.departmentId, name: employee.departmentName }
      : null;
  return (
    <>
      <p className="rounded-lg bg-warning-50 px-3 py-2 text-warning-800">
        Nhân viên này đang {handoverScopeText(employee)}. Chọn người nhận để bàn giao tất cả, hoặc
        bỏ qua — việc và dự án giữ nguyên, hiện nhãn "Đã nghỉ".
      </p>
      <EmployeePicker
        label="Người nhận bàn giao (tuỳ chọn)"
        value={receiver}
        onChange={onChange}
        excludeIds={[employee.id]}
        department={department}
      />
      {error && (
        <p role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      )}
    </>
  );
}
