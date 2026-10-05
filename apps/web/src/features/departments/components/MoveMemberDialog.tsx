import { useState } from 'react';
import { ConfirmDialog, Select, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useDepartmentOptions } from '../hooks/useDepartments';
import { useAddMember } from '../hooks/useDepartmentMutations';
import type { DepartmentDetail, DepartmentMember } from '../types';

interface MoveMemberDialogProps {
  department: DepartmentDetail;
  member: DepartmentMember;
  onClose: () => void;
}

/** [Chuyển phòng] một thành viên; chuyển trưởng phòng thì phòng cũ "Chưa có trưởng phòng" hoặc nhận người mới. */
export function MoveMemberDialog({ department, member, onClose }: MoveMemberDialogProps) {
  const toast = useToast();
  const [targetId, setTargetId] = useState('');
  const [replacementId, setReplacementId] = useState('');
  const options = useDepartmentOptions();
  const move = useAddMember();
  const targets = (options.data ?? []).filter((option) => option.id !== department.id);
  const replacements = department.members.filter((other) => other.id !== member.id);

  async function handleConfirm() {
    try {
      await move.mutateAsync({
        departmentId: targetId,
        employeeId: member.id,
        replacementManagerId: replacementId || null,
      });
      const target = targets.find((option) => option.id === targetId);
      toast({ message: `Đã chuyển ${member.fullName} sang ${target?.name ?? 'phòng mới'}` });
      onClose();
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <ConfirmDialog
      open
      onClose={onClose}
      title={`Chuyển phòng cho ${member.fullName}`}
      confirmLabel="Chuyển phòng"
      tone="primary"
      loading={move.isPending}
      confirmDisabled={!targetId}
      onConfirm={handleConfirm}
      description={<p>Thao tác được ghi vào nhật ký hệ thống.</p>}
    >
      <Select
        label="Phòng ban mới"
        placeholder="Chọn phòng ban"
        options={targets.map((option) => ({ value: option.id, label: option.name }))}
        value={targetId}
        onChange={(event) => setTargetId(event.target.value)}
        disabled={options.isPending}
        error={options.isError ? 'Không tải được danh sách phòng ban' : undefined}
      />
      {member.isManager && (
        <>
          <p className="rounded-lg bg-warning-50 px-3 py-2 text-warning-800">
            {member.fullName} đang là trưởng phòng. Phòng {department.name} sẽ chưa có trưởng phòng
            nếu không chọn người thay.
          </p>
          <Select
            label="Chọn trưởng phòng mới (tuỳ chọn)"
            placeholder="Chọn sau"
            options={replacements.map((other) => ({ value: other.id, label: other.fullName }))}
            value={replacementId}
            onChange={(event) => setReplacementId(event.target.value)}
          />
        </>
      )}
    </ConfirmDialog>
  );
}
