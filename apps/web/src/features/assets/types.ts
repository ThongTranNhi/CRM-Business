// /api/assets/products (docs/api/endpoints/assets.md).

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
