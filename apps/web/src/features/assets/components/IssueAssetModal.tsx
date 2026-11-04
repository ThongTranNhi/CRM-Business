import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import {
  Button,
  ErrorState,
  Input,
  Modal,
  ModalActions,
  Skeleton,
  Textarea,
  useToast,
} from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { ApiError, errorMessage } from '@/lib/api-client';
import { todayInVietnam } from '@/lib/format-date';
import { useIssueAsset, useIssueFormOptions } from '../hooks/useIssuedAssets';
import { issueInputOf } from '../issued-assets.utils';
import {
  issueFormSchema,
  type IssueForm,
  type IssueFormErrors,
} from '../schemas/issued-asset.schema';
import type { IssuedAsset, IssueFormOptions } from '../types';
import { IssueHolderFields } from './IssueHolderFields';

interface IssueAssetModalProps {
  asset: IssuedAsset;
  onClose: () => void;
}

/** [Cấp]: chọn đối tượng sử dụng (cá nhân / phòng ban / công ty), người cấp (mặc định là mình), ngày cấp. */
export function IssueAssetModal({ asset, onClose }: IssueAssetModalProps) {
  const options = useIssueFormOptions();
  const user = useCurrentUser();
  return (
    <Modal open onClose={onClose} title={`Cấp tài sản: ${asset.name}`}>
      {options.isError || user.isError ? (
        <ErrorState onRetry={() => void options.refetch()} />
      ) : !options.data || !user.data ? (
        <Skeleton className="h-64" />
      ) : (
        <IssueAssetForm
          asset={asset}
          people={options.data.people}
          issuerEmployeeId={user.data.employeeId ?? ''}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

interface IssueAssetFormProps {
  asset: IssuedAsset;
  people: IssueFormOptions['people'];
  issuerEmployeeId: string;
  onClose: () => void;
}

/** Lỗi API gắn được vào ô. ASSET_PERSON_NOT_FOUND có thể là người dùng hoặc người cấp → toast. */
const FIELD_OF_ERROR: Partial<Record<string, keyof IssueForm>> = {
  DEPARTMENT_NOT_FOUND: 'departmentId',
};

function IssueAssetForm({ asset, people, issuerEmployeeId, onClose }: IssueAssetFormProps) {
  const toast = useToast();
  const issue = useIssueAsset(asset.id);
  const [errors, setErrors] = useState<IssueFormErrors>({});
  const [form, setForm] = useState<IssueForm>({
    holderType: 'employee',
    employeeId: '',
    departmentId: '',
    issuerEmployeeId,
    issuedOn: todayInVietnam(),
    note: '',
  });
  const change = (changes: Partial<IssueForm>) =>
    setForm((current) => ({ ...current, ...changes }));
  const personOptions = people.map((person) => ({
    value: person.id,
    label: person.departmentName
      ? `${person.fullName} — ${person.departmentName}`
      : person.fullName,
  }));

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const parsed = issueFormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      setErrors(
        Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value?.[0]])),
      );
      return;
    }
    setErrors({});
    issue.mutate(issueInputOf(parsed.data), {
      onSuccess: () => {
        toast({ message: `Đã cấp ${asset.name}` });
        onClose();
      },
      onError: (error) => {
        const field = error instanceof ApiError ? FIELD_OF_ERROR[error.code] : undefined;
        if (field) setErrors({ [field]: errorMessage(error) });
        else toast({ tone: 'error', message: errorMessage(error) });
      },
    });
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <IssueHolderFields form={form} errors={errors} people={personOptions} onChange={change} />
      <Input
        type="date"
        label="Ngày cấp"
        value={form.issuedOn}
        error={errors.issuedOn}
        onChange={(event) => change({ issuedOn: event.target.value })}
      />
      <Textarea
        label="Ghi chú (tuỳ chọn)"
        value={form.note}
        maxLength={2000}
        error={errors.note}
        onChange={(event) => change({ note: event.target.value })}
      />
      <ModalActions>
        <Button variant="secondary" onClick={onClose}>
          Huỷ
        </Button>
        <Button type="submit" loading={issue.isPending}>
          Cấp tài sản
        </Button>
      </ModalActions>
    </form>
  );
}
