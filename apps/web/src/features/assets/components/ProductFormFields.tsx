import type { UseQueryResult } from '@tanstack/react-query';
import { Input, Select, Textarea } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useDepartmentOptions } from '@/features/departments';
import { PRODUCT_STATUS_META } from '../assets.utils';
import type { ProductForm, ProductFormErrors } from '../schemas/product.schema';
import { PRODUCT_STATUSES, type ProductFormOptions } from '../types';
import { ProductPeopleFields } from './ProductPeopleFields';

interface ProductFormFieldsProps {
  form: ProductForm;
  errors: ProductFormErrors;
  isEditing: boolean;
  /** false: người phụ trách — chỉ sửa link và mô tả. */
  canEditAll: boolean;
  options: UseQueryResult<ProductFormOptions>;
  onChange: (changes: Partial<ProductForm>) => void;
}

export function ProductFormFields({ form, errors, canEditAll, ...props }: ProductFormFieldsProps) {
  const { onChange } = props;
  return (
    <>
      {!props.isEditing && (
        <DepartmentField
          value={form.departmentId}
          error={errors.departmentId}
          // Đổi phòng → dự án cũ không còn hợp lệ (BR-30); người phụ trách giữ nguyên (mọi phòng).
          onChange={(departmentId) => onChange({ departmentId, projectId: '' })}
        />
      )}
      {canEditAll ? (
        <Input
          label="Tên sản phẩm"
          placeholder="Ví dụ: Website bán hàng"
          value={form.name}
          maxLength={120}
          error={errors.name}
          autoFocus
          onChange={(event) => onChange({ name: event.target.value })}
        />
      ) : (
        <p className="text-sm text-gray-600">
          Bạn là người phụ trách nên sửa được link và mô tả của <strong>{form.name}</strong>.
        </p>
      )}
      <Input
        type="url"
        label="Link sản phẩm"
        placeholder="https://"
        value={form.url}
        maxLength={2000}
        error={errors.url}
        onChange={(event) => onChange({ url: event.target.value })}
      />
      <Textarea
        label="Mô tả (tuỳ chọn)"
        value={form.description}
        maxLength={2000}
        error={errors.description}
        onChange={(event) => onChange({ description: event.target.value })}
      />
      {canEditAll && (
        <>
          <Select
            label="Trạng thái"
            options={PRODUCT_STATUSES.map((status) => ({
              value: status,
              label: PRODUCT_STATUS_META[status].label,
            }))}
            value={form.status}
            onChange={(event) => {
              const status = PRODUCT_STATUSES.find((value) => value === event.target.value);
              if (status) onChange({ status });
            }}
          />
          <ProductPeopleFields
            form={form}
            errors={errors}
            options={props.options}
            onChange={onChange}
          />
        </>
      )}
    </>
  );
}

interface DepartmentFieldProps {
  value: string;
  error?: string;
  onChange: (departmentId: string) => void;
}

/** Super Admin chọn mọi phòng; Trưởng phòng chỉ phòng mình quản lý (đã chọn sẵn, khoá). */
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
