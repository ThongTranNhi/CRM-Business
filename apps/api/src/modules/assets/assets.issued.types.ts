// /api/assets/issued — tab Tài sản được cấp của trang Tài sản (docs/api/endpoints/assets.md).

export const ISSUED_ASSET_CATEGORIES = [
  'laptop',
  'phone',
  'monitor',
  'sim',
  'access_card',
  'software',
  'other',
] as const;
export type IssuedAssetCategory = (typeof ISSUED_ASSET_CATEGORIES)[number];

/** `issued` chỉ do cấp / thu hồi đặt; tạo / sửa tay chọn trong EDITABLE_ASSET_STATUSES. */
export const ISSUED_ASSET_STATUSES = ['in_stock', 'issued', 'repair', 'disposed'] as const;
export type IssuedAssetStatus = (typeof ISSUED_ASSET_STATUSES)[number];
export const EDITABLE_ASSET_STATUSES = ['in_stock', 'repair', 'disposed'] as const;

/** Đối tượng sử dụng: một nhân viên, một phòng ban hoặc cả công ty. */
export const ASSET_HOLDER_TYPES = ['employee', 'department', 'company'] as const;
export type AssetHolderType = (typeof ASSET_HOLDER_TYPES)[number];

export interface AssetPerson {
  id: string;
  fullName: string;
  /** Đã nghỉ (BR-53) → giao diện hiện "đã nghỉ". */
  isArchived: boolean;
}

export type AssetHolder =
  | { type: 'company' }
  | { type: 'department'; id: string; name: string }
  | ({ type: 'employee' } & AssetPerson);

/** Một lượt cấp; `returnedOn` null = đang cấp. */
export interface AssetAssignment {
  id: string;
  holder: AssetHolder;
  /** Người cấp (chọn khi cấp, không bắt buộc là người nhập). */
  issuer: AssetPerson;
  issuedOn: string;
  note: string | null;
  returnedOn: string | null;
  returnNote: string | null;
}

export interface IssuedAsset {
  id: string;
  code: string | null;
  name: string;
  category: IssuedAssetCategory;
  status: IssuedAssetStatus;
  expiresOn: string | null;
  note: string | null;
  updatedAt: string;
  /** Lượt cấp đang mở (null khi chưa cấp). */
  assignment: Omit<AssetAssignment, 'returnedOn' | 'returnNote'> | null;
  permissions: { canManage: boolean };
}

/** Tài sản đọc từ DB, trước khi service gắn quyền của người xem. */
export type IssuedAssetRecord = Omit<IssuedAsset, 'permissions'>;

/** Dữ liệu cho form Cấp tài sản: người đang làm (đối tượng cá nhân, người cấp). Phòng ban lấy ở /api/departments. */
export interface IssueFormOptions {
  people: { id: string; fullName: string; departmentName: string | null }[];
}
