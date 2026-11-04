import type { BadgeTone } from '@/components/ui';
import { readPage } from '@/lib/use-url-params';
import type { IssueForm, IssuedAssetForm } from './schemas/issued-asset.schema';
import {
  ASSET_HOLDER_TYPES,
  EDITABLE_ASSET_STATUSES,
  ISSUED_ASSET_CATEGORIES,
  ISSUED_ASSET_STATUSES,
  type AssetHolder,
  type AssetHolderType,
  type EditableAssetStatus,
  type IssueAssetInput,
  type IssuedAsset,
  type IssuedAssetCategory,
  type IssuedAssetInput,
  type IssuedAssetParams,
  type IssuedAssetStatus,
} from './types';

export const ASSET_CATEGORY_LABELS: Record<IssuedAssetCategory, string> = {
  laptop: 'Laptop',
  phone: 'Điện thoại',
  monitor: 'Màn hình',
  sim: 'SIM',
  access_card: 'Thẻ ra vào',
  software: 'Phần mềm / tài khoản',
  other: 'Thiết bị khác',
};

/** Màu theo docs/ui-ux/colors.md mục 4: sẵn sàng success, đang dùng info, sửa chữa warning, thanh lý neutral. */
export const ASSET_STATUS_META: Record<IssuedAssetStatus, { label: string; tone: BadgeTone }> = {
  in_stock: { label: 'Trong kho', tone: 'success' },
  issued: { label: 'Đang cấp', tone: 'info' },
  repair: { label: 'Sửa chữa', tone: 'warning' },
  disposed: { label: 'Thanh lý', tone: 'neutral' },
};

export const ASSET_HOLDER_LABELS: Record<AssetHolderType, string> = {
  employee: 'Cá nhân',
  department: 'Phòng ban',
  company: 'Công ty',
};

/** Tên đối tượng đang dùng: "Công ty", tên phòng, hoặc tên người (kèm "đã nghỉ"). */
export function holderName(holder: AssetHolder): string {
  if (holder.type === 'company') return 'Toàn công ty';
  if (holder.type === 'department') return holder.name;
  return holder.isArchived ? `${holder.fullName} (đã nghỉ)` : holder.fullName;
}

/** Đọc bộ lọc tab Tài sản được cấp từ URL; giá trị sai → mặc định. */
export function readIssuedAssetParams(params: URLSearchParams): IssuedAssetParams {
  const pick = <T extends string>(key: string, allowed: readonly T[]): T | '' =>
    allowed.find((value) => value === params.get(key)) ?? '';
  return {
    q: params.get('q') ?? '',
    category: pick('category', ISSUED_ASSET_CATEGORIES),
    status: pick('status', ISSUED_ASSET_STATUSES),
    holderType: pick('holder', ASSET_HOLDER_TYPES),
    page: readPage(params),
  };
}

export const hasIssuedAssetFilters = (params: IssuedAssetParams): boolean =>
  params.q !== '' || params.category !== '' || params.status !== '' || params.holderType !== '';

/** Đang cấp thì form sửa không đổi trạng thái (giữ Trong kho làm giá trị ô, ô bị khoá). */
const editableStatus = (status: IssuedAssetStatus): EditableAssetStatus =>
  EDITABLE_ASSET_STATUSES.find((value) => value === status) ?? 'in_stock';

export const issuedAssetFormOf = (asset: IssuedAsset | undefined): IssuedAssetForm => ({
  code: asset?.code ?? '',
  name: asset?.name ?? '',
  category: asset?.category ?? 'laptop',
  status: asset ? editableStatus(asset.status) : 'in_stock',
  expiresOn: asset?.expiresOn ?? '',
  note: asset?.note ?? '',
});

/** Giá trị form → body API ('' = null). */
export const issuedAssetInputOf = (form: IssuedAssetForm): IssuedAssetInput => ({
  code: form.code || null,
  name: form.name,
  category: form.category,
  status: form.status,
  expiresOn: form.expiresOn || null,
  note: form.note || null,
});

/** PATCH chỉ gửi trường đã đổi; tài sản đang cấp không gửi trạng thái (server chặn đổi tay). */
export function issuedAssetChanges(
  asset: IssuedAsset,
  input: IssuedAssetInput,
): Partial<IssuedAssetInput> {
  const current = issuedAssetInputOf(issuedAssetFormOf(asset));
  const keys = (Object.keys(input) as (keyof IssuedAssetInput)[]).filter(
    (key) => input[key] !== current[key] && !(key === 'status' && asset.status === 'issued'),
  );
  return Object.fromEntries(keys.map((key) => [key, input[key]]));
}

/** Form [Cấp] → body: chỉ gửi id của đúng loại đối tượng. */
export function issueInputOf(form: IssueForm): IssueAssetInput {
  const base = {
    issuerEmployeeId: form.issuerEmployeeId,
    issuedOn: form.issuedOn,
    note: form.note || null,
  };
  if (form.holderType === 'employee') {
    return { ...base, holderType: 'employee', employeeId: form.employeeId };
  }
  if (form.holderType === 'department') {
    return { ...base, holderType: 'department', departmentId: form.departmentId };
  }
  return { ...base, holderType: 'company' };
}
