import { Input, Select, Textarea } from '@/components/ui';
import { ASSET_CATEGORY_LABELS, ASSET_STATUS_META } from '../issued-assets.utils';
import type { IssuedAssetForm, IssuedAssetFormErrors } from '../schemas/issued-asset.schema';
import { EDITABLE_ASSET_STATUSES, ISSUED_ASSET_CATEGORIES } from '../types';

interface IssuedAssetFieldsProps {
  form: IssuedAssetForm;
  errors: IssuedAssetFormErrors;
  /** Có: ô trạng thái khoá, chỉ hiện nhãn này (đang cấp, hoặc cấp luôn khi thêm). null: chọn tay. */
  lockedStatusLabel: string | null;
  onChange: (changes: Partial<IssuedAssetForm>) => void;
}

/** Các ô của tài sản: tên, mã, loại, trạng thái, ngày hết hạn, ghi chú. */
export function IssuedAssetFields({
  form,
  errors,
  lockedStatusLabel,
  onChange,
}: IssuedAssetFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Input
            label="Tên tài sản"
            placeholder="Ví dụ: Laptop Dell Latitude 5440"
            value={form.name}
            maxLength={120}
            error={errors.name}
            autoFocus
            onChange={(event) => onChange({ name: event.target.value })}
          />
        </div>
        <Input
          label="Mã (tuỳ chọn)"
          placeholder="LT-001"
          value={form.code}
          maxLength={40}
          error={errors.code}
          onChange={(event) => onChange({ code: event.target.value })}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          label="Loại"
          options={ISSUED_ASSET_CATEGORIES.map((category) => ({
            value: category,
            label: ASSET_CATEGORY_LABELS[category],
          }))}
          value={form.category}
          onChange={(event) => {
            const category = ISSUED_ASSET_CATEGORIES.find((value) => value === event.target.value);
            if (category) onChange({ category });
          }}
        />
        <Select
          label="Trạng thái"
          options={
            lockedStatusLabel !== null
              ? [{ value: form.status, label: lockedStatusLabel }]
              : EDITABLE_ASSET_STATUSES.map((status) => ({
                  value: status,
                  label: ASSET_STATUS_META[status].label,
                }))
          }
          value={form.status}
          disabled={lockedStatusLabel !== null}
          error={errors.status}
          onChange={(event) => {
            const status = EDITABLE_ASSET_STATUSES.find((value) => value === event.target.value);
            if (status) onChange({ status });
          }}
        />
      </div>
      <Input
        type="date"
        label="Ngày hết hạn (tuỳ chọn — bảo hành, bản quyền phần mềm)"
        value={form.expiresOn}
        error={errors.expiresOn}
        onChange={(event) => onChange({ expiresOn: event.target.value })}
      />
      <Textarea
        label="Ghi chú (tuỳ chọn)"
        placeholder="Cấu hình, số serial… Không ghi mật khẩu hay key bản quyền."
        value={form.note}
        maxLength={2000}
        error={errors.note}
        onChange={(event) => onChange({ note: event.target.value })}
      />
    </>
  );
}
