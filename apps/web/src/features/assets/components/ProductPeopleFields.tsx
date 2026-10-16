import type { UseQueryResult } from '@tanstack/react-query';
import { Select, Skeleton } from '@/components/ui';
import { MemberMultiSelect } from '@/features/tasks';
import type { ProductForm, ProductFormErrors } from '../schemas/product.schema';
import type { ProductFormOptions } from '../types';

interface ProductPeopleFieldsProps {
  form: ProductForm;
  errors: ProductFormErrors;
  options: UseQueryResult<ProductFormOptions>;
  onChange: (changes: Partial<ProductForm>) => void;
}

/** Người phụ trách chính, người cùng phụ trách (mọi phòng), dự án liên quan (cùng phòng — BR-30). */
export function ProductPeopleFields({ form, errors, options, onChange }: ProductPeopleFieldsProps) {
  if (!form.departmentId) {
    return (
      <p className="text-sm text-gray-500">Chọn phòng ban để chọn người phụ trách và dự án.</p>
    );
  }
  if (options.isPending) return <Skeleton className="h-40 w-full" />;
  if (options.isError) {
    return (
      <p role="alert" className="text-sm text-danger-700">
        Không tải được danh sách người và dự án. Đóng form và thử lại.
      </p>
    );
  }
  const { people, projects } = options.data;
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Người phụ trách chính"
          placeholder="Chọn người"
          options={people.map((person) => ({
            value: person.id,
            label: person.departmentName
              ? `${person.fullName} — ${person.departmentName}`
              : person.fullName,
          }))}
          value={form.ownerEmployeeId}
          error={errors.ownerEmployeeId}
          // Người phụ trách chính không đồng thời là người cùng phụ trách.
          onChange={(event) =>
            onChange({
              ownerEmployeeId: event.target.value,
              memberIds: form.memberIds.filter((id) => id !== event.target.value),
            })
          }
        />
        <Select
          label="Dự án liên quan (tuỳ chọn)"
          placeholder="Không gắn dự án"
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          value={form.projectId}
          error={errors.projectId}
          onChange={(event) => onChange({ projectId: event.target.value })}
        />
      </div>
      <MemberMultiSelect
        label="Người cùng phụ trách (tuỳ chọn)"
        members={people
          .filter((person) => person.id !== form.ownerEmployeeId)
          .map((person) => ({ id: person.id, fullName: person.fullName, avatarUrl: null }))}
        value={form.memberIds}
        onChange={(memberIds) => onChange({ memberIds })}
      />
      {errors.memberIds && (
        <p role="alert" className="text-sm text-danger-700">
          {errors.memberIds}
        </p>
      )}
    </>
  );
}
