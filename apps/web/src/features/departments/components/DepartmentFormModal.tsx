import { useState, type FormEvent } from 'react';
import { Button, Input, Modal, ModalActions, useToast } from '@/components/ui';
import { EmployeePicker, type PickedEmployee } from '@/features/employees';
import { errorMessage, hasErrorCode } from '@/lib/api-client';
import { useCreateDepartment, useUpdateDepartment } from '../hooks/useDepartmentMutations';
import { departmentNameSchema } from '../schemas/department.schema';
import type { Department, DepartmentChanges, DepartmentDetail } from '../types';

interface DepartmentFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Có: sửa phòng ban này. Không có: tạo phòng ban mới. */
  department?: Department;
}

/** Tạo / sửa phòng ban (BR-08): tên không trùng, trưởng phòng tuỳ chọn. Không tạo Dashboard (BR-02). */
export function DepartmentFormModal({ open, onClose, department }: DepartmentFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={department ? 'Sửa phòng ban' : 'Tạo phòng ban'}>
      <DepartmentForm department={department} onDone={onClose} />
    </Modal>
  );
}

interface DepartmentFormProps {
  department?: Department;
  onDone: () => void;
  /** Gọi sau khi tạo mới thành công, trước onDone (vd. modal Tạo Dashboard chọn sẵn phòng mới). */
  onCreated?: (department: DepartmentDetail) => void;
}

function changesOf(department: Department, name: string, manager: PickedEmployee | null) {
  const changes: DepartmentChanges = {};
  if (name !== department.name) changes.name = name;
  if ((manager?.id ?? null) !== (department.manager?.id ?? null))
    changes.managerId = manager?.id ?? null;
  return changes;
}

/** Q1: trưởng phòng chỉ quản lý được Dashboard khi có role Trưởng phòng. */
const needsManagerRole = (manager: PickedEmployee | null) =>
  manager?.role !== undefined && manager.role !== 'department_manager';

export function DepartmentForm({ department, onDone, onCreated }: DepartmentFormProps) {
  const toast = useToast();
  const [name, setName] = useState(department?.name ?? '');
  const [manager, setManager] = useState<PickedEmployee | null>(department?.manager ?? null);
  const [nameError, setNameError] = useState<string>();
  const create = useCreateDepartment();
  const update = useUpdateDepartment(department?.id ?? '');

  async function save(validName: string) {
    if (!department) {
      onCreated?.(await create.mutateAsync({ name: validName, managerId: manager?.id ?? null }));
      return 'Đã tạo phòng ban';
    }
    const changes = changesOf(department, validName, manager);
    if (Object.keys(changes).length > 0) await update.mutateAsync(changes);
    return 'Đã cập nhật phòng ban';
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = departmentNameSchema.safeParse(name);
    if (!parsed.success) {
      setNameError(parsed.error.issues[0]?.message);
      return;
    }
    try {
      toast({ message: await save(parsed.data) });
      onDone();
    } catch (error) {
      if (hasErrorCode(error, 'DEPARTMENT_NAME_EXISTS')) setNameError(errorMessage(error));
      else toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      <Input
        label="Tên phòng ban"
        placeholder="Ví dụ: Chăm sóc khách hàng"
        value={name}
        maxLength={120}
        error={nameError}
        autoFocus
        onChange={(event) => {
          setName(event.target.value);
          setNameError(undefined);
        }}
      />
      <EmployeePicker label="Trưởng phòng (tuỳ chọn)" value={manager} onChange={setManager} />
      {needsManagerRole(manager) && (
        <p role="status" className="rounded-lg bg-warning-100 px-3 py-2 text-sm text-warning-800">
          Người này chưa có vai trò Trưởng phòng nên chưa tạo và quản lý được Dashboard của phòng.
        </p>
      )}
      <p className="text-sm text-gray-500">
        Chưa chọn trưởng phòng thì phòng ban hiện "Chưa có trưởng phòng", có thể chọn sau. Người
        đang ở phòng khác sẽ được chuyển sang phòng này. Tạo phòng ban không tự tạo Dashboard.
      </p>
      <ModalActions>
        <Button variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
        <Button type="submit" loading={create.isPending || update.isPending}>
          {department ? 'Lưu thay đổi' : 'Tạo phòng ban'}
        </Button>
      </ModalActions>
    </form>
  );
}
