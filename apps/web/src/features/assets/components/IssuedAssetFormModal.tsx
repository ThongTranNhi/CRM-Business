import { useState, type FormEvent } from 'react';
import { Button, Modal, ModalActions } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { todayInVietnam } from '@/lib/format-date';
import { useSubmitIssuedAsset, type SubmitErrors } from '../hooks/useSubmitIssuedAsset';
import { issuedAssetFormOf } from '../issued-assets.utils';
import type { IssueForm, IssuedAssetForm } from '../schemas/issued-asset.schema';
import type { IssuedAsset } from '../types';
import { AssignOnCreateFields } from './AssignOnCreateFields';
import { IssuedAssetFields } from './IssuedAssetFields';

interface IssuedAssetFormModalProps {
  onClose: () => void;
  /** Có: sửa tài sản này. Không: thêm mới (chọn được đối tượng sử dụng để cấp luôn). */
  asset?: IssuedAsset;
}

/** Thêm / sửa tài sản. Không có ô key bản quyền / mật khẩu (chủ dự án chốt 03/11/2026: không lưu bí mật). */
export function IssuedAssetFormModal({ onClose, asset }: IssuedAssetFormModalProps) {
  const { data: user } = useCurrentUser();
  const [form, setForm] = useState(() => issuedAssetFormOf(asset));
  const [assignNow, setAssignNow] = useState(false);
  const [issue, setIssue] = useState<IssueForm>(() => ({
    holderType: 'employee',
    employeeId: '',
    departmentId: '',
    issuerEmployeeId: user?.employeeId ?? '',
    issuedOn: todayInVietnam(),
    note: '',
  }));
  const [errors, setErrors] = useState<SubmitErrors>({ asset: {}, issue: {} });
  const { submit, isPending } = useSubmitIssuedAsset(asset, onClose);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors(await submit(form, assignNow ? issue : null));
  }

  function changeAssignNow(value: boolean) {
    setAssignNow(value);
    // Cấp luôn → tài sản phải đang Trong kho.
    if (value) setForm((current) => ({ ...current, status: 'in_stock' }));
  }

  return (
    <Modal open onClose={onClose} title={asset ? 'Sửa tài sản' : 'Thêm tài sản'}>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <IssuedAssetFields
          form={form}
          errors={errors.asset}
          lockedStatusLabel={
            asset?.status === 'issued'
              ? 'Đang cấp — thu hồi để đổi'
              : assignNow
                ? 'Đang cấp (sau khi lưu)'
                : null
          }
          onChange={(changes: Partial<IssuedAssetForm>) =>
            setForm((current) => ({ ...current, ...changes }))
          }
        />
        {!asset && (
          <AssignOnCreateFields
            issue={issue}
            errors={errors.issue}
            assignNow={assignNow}
            onAssignNowChange={changeAssignNow}
            onChange={(changes) => setIssue((current) => ({ ...current, ...changes }))}
          />
        )}
        <ModalActions>
          <Button variant="secondary" onClick={onClose}>
            Huỷ
          </Button>
          <Button type="submit" loading={isPending}>
            {asset ? 'Lưu thay đổi' : assignNow ? 'Thêm và cấp' : 'Thêm tài sản'}
          </Button>
        </ModalActions>
      </form>
    </Modal>
  );
}
