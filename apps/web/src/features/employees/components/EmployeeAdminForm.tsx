import { useState, type FormEvent } from 'react';
import { Button, ConfirmDialog, Input, Select, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useSaveEmployee } from '../hooks/useEmployeeMutations';
import type { AdminEmployeeUpdate, DirectoryEmployee } from '../types';

interface EmployeeAdminFormProps {
  employee: DirectoryEmployee;
  departments: { id: string; name: string }[];
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Hoạt động' },
  { value: 'disabled', label: 'Khoá tài khoản' },
];

export function EmployeeAdminForm({ employee, departments }: EmployeeAdminFormProps) {
  const toast = useToast();
  const save = useSaveEmployee(employee.id);
  const [fullName, setFullName] = useState(employee.fullName);
  const [jobTitle, setJobTitle] = useState(employee.jobTitle ?? '');
  const [departmentId, setDepartmentId] = useState(employee.departmentId ?? '');
  const [status, setStatus] = useState(employee.status === 'disabled' ? 'disabled' : 'active');
  const [nameError, setNameError] = useState<string>();
  const [confirmingMove, setConfirmingMove] = useState(false);
  // Chuyển trưởng phòng sang phòng khác: phòng cũ thành "Chưa có trưởng phòng" — hỏi lại trước.
  const leavesManagedDepartment =
    employee.managedDepartment !== null && departmentId !== (employee.departmentId ?? '');

  async function persist() {
    const input: AdminEmployeeUpdate = {
      fullName: fullName.trim(),
      jobTitle: jobTitle.trim() || null,
      departmentId: departmentId || null,
      status: status === 'disabled' ? 'disabled' : 'active',
    };
    try {
      await save.mutateAsync(input);
      toast({ message: 'Đã cập nhật hồ sơ nhân viên' });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    } finally {
      setConfirmingMove(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!fullName.trim()) {
      setNameError('Vui lòng nhập tên nhân viên');
      return;
    }
    if (leavesManagedDepartment) setConfirmingMove(true);
    else void persist();
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4">
      <Input
        label="Tên nhân viên"
        value={fullName}
        maxLength={120}
        error={nameError}
        onChange={(event) => {
          setFullName(event.target.value);
          setNameError(undefined);
        }}
      />
      <Input
        label="Chức vụ"
        value={jobTitle}
        maxLength={120}
        onChange={(event) => setJobTitle(event.target.value)}
      />
      <Select
        label="Phòng ban"
        placeholder="Chưa gán"
        options={departments.map((department) => ({
          value: department.id,
          label: department.name,
        }))}
        value={departmentId}
        onChange={(event) => setDepartmentId(event.target.value)}
      />
      <Select
        label="Trạng thái tài khoản"
        options={STATUS_OPTIONS}
        value={status}
        onChange={(event) => setStatus(event.target.value)}
      />
      <Button type="submit" loading={save.isPending && !confirmingMove}>
        Lưu hồ sơ nhân viên
      </Button>
      <ConfirmDialog
        open={confirmingMove}
        onClose={() => setConfirmingMove(false)}
        title="Chuyển trưởng phòng sang phòng khác?"
        description={
          <p>
            {employee.fullName} đang là trưởng phòng {employee.managedDepartment?.name}. Phòng{' '}
            {employee.managedDepartment?.name} sẽ chưa có trưởng phòng.
          </p>
        }
        confirmLabel="Lưu và chuyển phòng"
        tone="primary"
        loading={save.isPending}
        onConfirm={() => void persist()}
      />
    </form>
  );
}
