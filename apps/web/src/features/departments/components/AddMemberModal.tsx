import { useState } from 'react';
import { Button, Modal, ModalActions, useToast } from '@/components/ui';
import { EmployeePicker, type PickedEmployee } from '@/features/employees';
import { errorMessage } from '@/lib/api-client';
import { useAddMember } from '../hooks/useDepartmentMutations';
import type { DepartmentDetail } from '../types';

interface AddMemberModalProps {
  department: DepartmentDetail;
  open: boolean;
  onClose: () => void;
}

export function AddMemberModal({ department, open, onClose }: AddMemberModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={`Thêm thành viên vào ${department.name}`}>
      <AddMemberForm department={department} onDone={onClose} />
    </Modal>
  );
}

interface AddMemberFormProps {
  department: DepartmentDetail;
  onDone: () => void;
}

function AddMemberForm({ department, onDone }: AddMemberFormProps) {
  const toast = useToast();
  const [employee, setEmployee] = useState<PickedEmployee | null>(null);
  const add = useAddMember();

  async function handleAdd() {
    if (!employee) return;
    try {
      await add.mutateAsync({
        departmentId: department.id,
        employeeId: employee.id,
        replacementManagerId: null,
      });
      toast({ message: `Đã thêm ${employee.fullName} vào ${department.name}` });
      onDone();
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <div className="space-y-4">
      <EmployeePicker
        label="Nhân viên"
        value={employee}
        onChange={setEmployee}
        excludeIds={department.members.map((member) => member.id)}
      />
      <p className="text-sm text-gray-500">
        Người đang ở phòng khác sẽ được chuyển sang phòng này. Nếu họ đang là trưởng phòng ở phòng
        cũ, phòng đó sẽ chưa có trưởng phòng.
      </p>
      <ModalActions>
        <Button variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
        <Button disabled={!employee} loading={add.isPending} onClick={handleAdd}>
          Thêm thành viên
        </Button>
      </ModalActions>
    </div>
  );
}
