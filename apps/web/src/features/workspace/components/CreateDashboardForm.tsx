import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button, Icon, Input, ModalActions, Select, Textarea } from '@/components/ui';
import { useSubmitDashboard } from '../hooks/useSubmitDashboard';
import {
  createDashboardFormSchema,
  type CreateDashboardErrors,
} from '../schemas/create-dashboard.schema';
import type { DepartmentOption } from '../types';

interface CreateDashboardFormProps {
  options: DepartmentOption[];
  initialDepartmentId: string | null;
  /** null: người dùng không được tạo phòng ban (BR-08) → ẩn link. */
  onNewDepartment: (() => void) | null;
  onCancel: () => void;
}

/** Bước chọn phòng + tên + mô tả của modal Tạo Dashboard (workspace.md). */
export function CreateDashboardForm({
  options,
  initialDepartmentId,
  onNewDepartment,
  onCancel,
}: CreateDashboardFormProps) {
  const initial = options.find((option) => option.id === initialDepartmentId) ?? options[0];
  const [departmentId, setDepartmentId] = useState(initial?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<CreateDashboardErrors>({});
  const { submit, isPending } = useSubmitDashboard();

  function selectDepartment(id: string) {
    setDepartmentId(id);
    setName(options.find((option) => option.id === id)?.name ?? '');
    setErrors({});
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = createDashboardFormSchema.safeParse({ departmentId, name, description });
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors({
        departmentId: fields.departmentId?.[0],
        name: fields.name?.[0],
        description: fields.description?.[0],
      });
      return;
    }
    setErrors(await submit(parsed.data));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {options.length > 0 ? (
        <Select
          label="Phòng ban"
          options={options.map((option) => ({
            value: option.id,
            label: option.isNew ? `${option.name} (mới tạo)` : option.name,
          }))}
          value={departmentId}
          error={errors.departmentId}
          onChange={(event) => selectDepartment(event.target.value)}
        />
      ) : (
        <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600">
          Mọi phòng ban bạn được tạo đều đã có Dashboard.
        </p>
      )}
      {onNewDepartment && (
        <button
          type="button"
          onClick={onNewDepartment}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
        >
          <Icon name="plus" size={16} />
          Chưa có phòng ban cần tìm? Tạo phòng ban mới
        </button>
      )}
      <Input
        label="Tên Dashboard"
        value={name}
        maxLength={120}
        error={errors.name}
        onChange={(event) => setName(event.target.value)}
      />
      <Textarea
        label="Mô tả (tuỳ chọn)"
        value={description}
        maxLength={1000}
        error={errors.description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <p className="text-sm text-gray-500">
        Board mới có sẵn 3 cột: Việc cần làm, Việc đang làm, Đã hoàn thành.
      </p>
      <ModalActions>
        <Button variant="secondary" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={isPending} disabled={options.length === 0}>
          Tạo Dashboard
        </Button>
      </ModalActions>
    </form>
  );
}
