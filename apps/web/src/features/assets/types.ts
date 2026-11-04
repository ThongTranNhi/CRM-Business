// /api/assets/products và /api/assets/issued (docs/api/endpoints/assets.md).

export const ASSET_TABS = ['products', 'issued'] as const;
export type AssetTab = (typeof ASSET_TABS)[number];

export const PRODUCT_STATUSES = ['developing', 'active', 'paused', 'discontinued'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

/** Loại: sản phẩm công ty (mặc định) hoặc website doanh nghiệp hợp tác — tách khỏi trạng thái. */
export const PRODUCT_KINDS = ['company', 'partner'] as const;
export type ProductKind = (typeof PRODUCT_KINDS)[number];

export interface ProductPerson {
  id: string;
  fullName: string;
  isArchived: boolean;
}

export interface Product {
  id: string;
  name: string;
  /** Luôn http(s) (server kiểm tra) — mở tab mới. */
  url: string;
  description: string | null;
  status: ProductStatus;
  kind: ProductKind;
  department: { id: string; name: string };
  project: { id: string; name: string } | null;
  owner: ProductPerson;
  /** Người cùng phụ trách (không gồm người phụ trách chính). */
  members: ProductPerson[];
  updatedAt: string;
  permissions: {
    /** Sửa mọi trường: Super Admin, Trưởng phòng của phòng. */
    canEdit: boolean;
    /** Sửa link, mô tả: thêm người phụ trách chính / cùng phụ trách. */
    canEditContent: boolean;
    canArchive: boolean;
  };
}

/** Body tạo / sửa (PATCH chỉ gửi trường đã đổi). */
export interface ProductInput {
  name: string;
  url: string;
  description: string | null;
  status: ProductStatus;
  kind: ProductKind;
  ownerEmployeeId: string;
  projectId: string | null;
  memberIds: string[];
}

export interface ProductFormOptions {
  people: { id: string; fullName: string; departmentName: string | null }[];
  projects: { id: string; name: string }[];
}

/** Bộ lọc trên URL: `?tab=products&q=&department=&status=&kind=&page=`. */
export interface ProductParams {
  q: string;
  departmentId: string;
  status: ProductStatus | '';
  kind: ProductKind | '';
  page: number;
}

// ---------- Tab Tài sản được cấp: /api/assets/issued ----------

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

export const ISSUED_ASSET_STATUSES = ['in_stock', 'issued', 'repair', 'disposed'] as const;
export type IssuedAssetStatus = (typeof ISSUED_ASSET_STATUSES)[number];
/** Trạng thái chọn tay; Đang cấp chỉ có được qua [Cấp] / [Thu hồi]. */
export const EDITABLE_ASSET_STATUSES = ['in_stock', 'repair', 'disposed'] as const;
export type EditableAssetStatus = (typeof EDITABLE_ASSET_STATUSES)[number];

/** Đối tượng sử dụng: một nhân viên, một phòng ban hoặc cả công ty. */
export const ASSET_HOLDER_TYPES = ['employee', 'department', 'company'] as const;
export type AssetHolderType = (typeof ASSET_HOLDER_TYPES)[number];

export type AssetHolder =
  | { type: 'company' }
  | { type: 'department'; id: string; name: string }
  | ({ type: 'employee' } & ProductPerson);

export interface AssetAssignment {
  id: string;
  holder: AssetHolder;
  /** Người cấp. */
  issuer: ProductPerson;
  issuedOn: string;
  note: string | null;
  /** null = đang cấp. */
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
  /** Lượt cấp đang mở. */
  assignment: Omit<AssetAssignment, 'returnedOn' | 'returnNote'> | null;
  permissions: { canManage: boolean };
}

/** Body thêm / sửa tài sản (PATCH chỉ gửi trường đã đổi). */
export interface IssuedAssetInput {
  code: string | null;
  name: string;
  category: IssuedAssetCategory;
  status: EditableAssetStatus;
  expiresOn: string | null;
  note: string | null;
}

/** Body [Cấp]: chỉ gửi id đúng với loại đối tượng. */
export type IssueAssetInput = {
  issuerEmployeeId: string;
  issuedOn: string;
  note: string | null;
} & (
  | { holderType: 'employee'; employeeId: string }
  | { holderType: 'department'; departmentId: string }
  | { holderType: 'company' }
);

export interface ReturnAssetInput {
  returnedOn: string;
  note: string | null;
}

export interface IssueFormOptions {
  people: { id: string; fullName: string; departmentName: string | null }[];
}

/** Bộ lọc trên URL: `?tab=issued&q=&category=&status=&holder=&page=`. */
export interface IssuedAssetParams {
  q: string;
  category: IssuedAssetCategory | '';
  status: IssuedAssetStatus | '';
  holderType: AssetHolderType | '';
  page: number;
}
