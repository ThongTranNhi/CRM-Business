import { z } from 'zod';
import { useToast } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api-client';
import { issuedAssetChanges, issuedAssetInputOf, issueInputOf } from '../issued-assets.utils';
import {
  issuedAssetFormSchema,
  issueFormSchema,
  type IssueForm,
  type IssueFormErrors,
  type IssuedAssetForm,
  type IssuedAssetFormErrors,
} from '../schemas/issued-asset.schema';
import type { IssueAssetInput, IssuedAsset } from '../types';
import { useCreateIssuedAsset, useUpdateIssuedAsset } from './useIssuedAssets';

/** Lỗi hiện dưới từng ô: phần tài sản và phần đối tượng sử dụng (khi cấp luôn lúc thêm). */
export interface SubmitErrors {
  asset: IssuedAssetFormErrors;
  issue: IssueFormErrors;
}

const NO_ERRORS: SubmitErrors = { asset: {}, issue: {} };

/** Lỗi API gắn được vào ô (docs/api/endpoints/assets.md). */
const FIELD_OF_ERROR: Partial<
  Record<string, { asset: keyof IssuedAssetForm } | { issue: keyof IssueForm }>
> = {
  ASSET_CODE_EXISTS: { asset: 'code' },
  ASSET_STATUS_LOCKED: { asset: 'status' },
  DEPARTMENT_NOT_FOUND: { issue: 'departmentId' },
};

function fieldErrors<T>(error: z.ZodError<T>): Record<string, string | undefined> {
  const fields: Record<string, string[] | undefined> = z.flattenError(error).fieldErrors;
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value?.[0]]));
}

function apiFieldErrors(error: unknown): SubmitErrors | null {
  const target = error instanceof ApiError ? FIELD_OF_ERROR[error.code] : undefined;
  if (!target) return null;
  const message = errorMessage(error);
  return 'asset' in target
    ? { asset: { [target.asset]: message }, issue: {} }
    : { asset: {}, issue: { [target.issue]: message } };
}

/**
 * Validate (zod) rồi thêm / sửa tài sản. Thêm mới kèm `issue` → cấp luôn cho đối tượng đó (cùng giao dịch ở DB).
 * Trả lỗi theo ô; thành công → toast + `onDone()`; lỗi không gắn được ô nào → toast, giữ nguyên dữ liệu đã nhập.
 */
export function useSubmitIssuedAsset(asset: IssuedAsset | undefined, onDone: () => void) {
  const toast = useToast();
  const create = useCreateIssuedAsset();
  const update = useUpdateIssuedAsset(asset?.id ?? '');

  async function save(form: IssuedAssetForm, assignment: IssueAssetInput | null) {
    const input = issuedAssetInputOf(form);
    if (!asset) {
      await create.mutateAsync({ ...input, assignment });
      return;
    }
    const changes = issuedAssetChanges(asset, input);
    if (Object.keys(changes).length > 0) await update.mutateAsync(changes);
  }

  async function submit(form: IssuedAssetForm, issue: IssueForm | null): Promise<SubmitErrors> {
    const parsed = issuedAssetFormSchema.safeParse(form);
    const parsedIssue = issue ? issueFormSchema.safeParse(issue) : null;
    if (!parsed.success || (parsedIssue && !parsedIssue.success)) {
      return {
        asset: parsed.success ? {} : fieldErrors(parsed.error),
        issue: parsedIssue && !parsedIssue.success ? fieldErrors(parsedIssue.error) : {},
      };
    }
    try {
      await save(parsed.data, parsedIssue ? issueInputOf(parsedIssue.data) : null);
      toast({ message: asset ? 'Đã cập nhật tài sản' : 'Đã thêm tài sản' });
      onDone();
      return NO_ERRORS;
    } catch (error) {
      const errors = apiFieldErrors(error);
      if (errors) return errors;
      toast({ tone: 'error', message: errorMessage(error) });
      return NO_ERRORS;
    }
  }

  return { submit, isPending: create.isPending || update.isPending };
}
