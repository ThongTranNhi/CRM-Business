import type { ReactNode } from 'react';
import { Select, type SelectOption } from '@/components/ui';
import { useDepartmentOptions } from '@/features/departments';
import { ASSET_HOLDER_LABELS } from '../issued-assets.utils';
import type { IssueForm, IssueFormErrors } from '../schemas/issued-asset.schema';
import { ASSET_HOLDER_TYPES } from '../types';

interface IssueHolderFieldsProps {
  form: IssueForm;
  errors: IssueFormErrors;
  /** Nhân viên đang làm (mọi phòng) — dùng cho cả ô cá nhân và ô người cấp. */
  people: SelectOption[];
  onChange: (changes: Partial<IssueForm>) => void;
  /** Form Thêm tài sản: thêm lựa chọn "Chưa cấp"; đang chọn thì ẩn các ô chọn người / phòng. */
  unassigned?: { selected: boolean; onSelect: () => void };
}

/** Đối tượng sử dụng (Cá nhân / Phòng ban / Công ty) + ô chọn tương ứng, rồi người cấp. */
export function IssueHolderFields({
  form,
  errors,
  people,
  onChange,
  unassigned,
}: IssueHolderFieldsProps) {
  const departments = useDepartmentOptions();
  const isUnassigned = unassigned?.selected ?? false;
  return (
    <>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium text-gray-700">Đối tượng sử dụng</legend>
        <div className="flex flex-wrap gap-2">
          {unassigned && (
            <HolderChoice checked={isUnassigned} onSelect={unassigned.onSelect}>
              Chưa cấp (để trong kho)
            </HolderChoice>
          )}
          {ASSET_HOLDER_TYPES.map((type) => (
            <HolderChoice
              key={type}
              checked={!isUnassigned && form.holderType === type}
              onSelect={() => onChange({ holderType: type })}
            >
              {ASSET_HOLDER_LABELS[type]}
            </HolderChoice>
          ))}
        </div>
      </fieldset>
      {!isUnassigned && form.holderType === 'employee' && (
        <Select
          label="Nhân viên sử dụng"
          placeholder="Chọn nhân viên"
          options={people}
          value={form.employeeId}
          error={errors.employeeId}
          onChange={(event) => onChange({ employeeId: event.target.value })}
        />
      )}
      {!isUnassigned && form.holderType === 'department' && (
        <Select
          label="Phòng ban sử dụng"
          placeholder="Chọn phòng ban"
          options={(departments.data ?? []).map((department) => ({
            value: department.id,
            label: department.name,
          }))}
          value={form.departmentId}
          error={errors.departmentId}
          onChange={(event) => onChange({ departmentId: event.target.value })}
        />
      )}
      {!isUnassigned && form.holderType === 'company' && (
        <p className="text-sm text-gray-600">Tài sản dùng chung cho toàn công ty.</p>
      )}
      {!isUnassigned && (
        <Select
          label="Người cấp"
          placeholder="Chọn người cấp"
          options={people}
          value={form.issuerEmployeeId}
          error={errors.issuerEmployeeId}
          onChange={(event) => onChange({ issuerEmployeeId: event.target.value })}
        />
      )}
    </>
  );
}

interface HolderChoiceProps {
  checked: boolean;
  onSelect: () => void;
  children: ReactNode;
}

function HolderChoice({ checked, onSelect, children }: HolderChoiceProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-card border border-gray-200 px-3 py-2 text-sm has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
      <input
        type="radio"
        name="holderType"
        checked={checked}
        className="accent-primary-600"
        onChange={onSelect}
      />
      {children}
    </label>
  );
}
