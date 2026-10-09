import type { UseQueryResult } from '@tanstack/react-query';
import { Input, Select, Skeleton, Textarea } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useDepartmentOptions } from '@/features/departments';
import { MemberMultiSelect } from '@/features/tasks';
import { PROJECT_STATUS_META, PROJECT_STATUSES } from '../project.utils';
import type { ProjectForm, ProjectFormErrors } from '../schemas/project.schema';
import type { EligibleMember } from '../types';

interface ProjectFormFieldsProps {
  form: ProjectForm;
  errors: ProjectFormErrors;
  /** Sửa: không đổi phòng ban; thành viên sửa ở tab Thành viên. */
  isEditing: boolean;
  eligible: UseQueryResult<EligibleMember[]>;
  onChange: (changes: Partial<ProjectForm>) => void;
}

export function ProjectFormFields({
  form,
  errors,
  isEditing,
  eligible,
  onChange,
}: ProjectFormFieldsProps) {
  const people = eligible.data ?? [];
  return (
    <>
      {!isEditing && (
        <DepartmentField
          value={form.departmentId}
          error={errors.departmentId}
          // Đổi phòng → chủ dự án / thành viên cũ không còn hợp lệ (Q6).
          onChange={(departmentId) =>
            onChange({ departmentId, ownerEmployeeId: '', memberIds: [] })
          }
        />
      )}
      <Input
        label="Tên dự án"
        placeholder="Ví dụ: Ra mắt website mới"
        value={form.name}
        maxLength={120}
        error={errors.name}
        autoFocus
        onChange={(event) => onChange({ name: event.target.value })}
      />
      <Textarea
        label="Mô tả (tuỳ chọn)"
        value={form.description}
        maxLength={2000}
        error={errors.description}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Chủ dự án (tuỳ chọn)"
          placeholder={form.departmentId ? 'Chưa chọn' : 'Chọn phòng ban trước'}
          disabled={!form.departmentId || eligible.isPending}
          options={people.map((person) => ({ value: person.id, label: person.fullName }))}
          value={form.ownerEmployeeId}
          error={errors.ownerEmployeeId}
          onChange={(event) => onChange({ ownerEmployeeId: event.target.value })}
        />
        <Select
          label="Trạng thái"
          options={PROJECT_STATUSES.map((status) => ({
            value: status,
            label: PROJECT_STATUS_META[status].label,
          }))}
          value={form.status}
          onChange={(event) => {
            const status = PROJECT_STATUSES.find((value) => value === event.target.value);
            if (status) onChange({ status });
          }}
        />
        <Input
          type="date"
          label="Ngày bắt đầu"
          value={form.startDate}
          onChange={(event) => onChange({ startDate: event.target.value })}
        />
        <Input
          type="date"
          label="Hạn"
          value={form.dueDate}
          min={form.startDate || undefined}
          error={errors.dueDate}
          onChange={(event) => onChange({ dueDate: event.target.value })}
        />
      </div>
      {!isEditing && form.departmentId && (
        <MembersField eligible={eligible} form={form} onChange={onChange} />
      )}
    </>
  );
}

interface DepartmentFieldProps {
  value: string;
  error?: string;
  onChange: (departmentId: string) => void;
}

/** Super Admin chọn mọi phòng; Trưởng phòng chỉ phòng mình quản lý (đã chọn sẵn). */
function DepartmentField({ value, error, onChange }: DepartmentFieldProps) {
  const { data: user } = useCurrentUser();
  const isSuperAdmin = user?.role === 'super_admin';
  const departments = useDepartmentOptions();
  const options = isSuperAdmin
    ? (departments.data ?? []).map((department) => ({
        value: department.id,
        label: department.name,
      }))
    : user?.managedDepartmentId
      ? [{ value: user.managedDepartmentId, label: user.departmentName ?? 'Phòng của tôi' }]
      : [];
  return (
    <Select
      label="Phòng ban"
      placeholder="Chọn phòng ban"
      options={options}
      value={value}
      error={error}
      disabled={!isSuperAdmin}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

interface MembersFieldProps {
  eligible: UseQueryResult<EligibleMember[]>;
  form: ProjectForm;
  onChange: (changes: Partial<ProjectForm>) => void;
}

function MembersField({ eligible, form, onChange }: MembersFieldProps) {
  if (eligible.isPending) return <Skeleton className="h-24 w-full" />;
  if (eligible.isError) {
    return (
      <p role="alert" className="text-sm text-danger-700">
        Không tải được danh sách người trong phòng.
      </p>
    );
  }
  return (
    <MemberMultiSelect
      label="Thành viên (tuỳ chọn — chủ dự án tự là thành viên)"
      members={eligible.data.filter((person) => person.id !== form.ownerEmployeeId)}
      value={form.memberIds}
      onChange={(memberIds) => onChange({ memberIds })}
    />
  );
}
