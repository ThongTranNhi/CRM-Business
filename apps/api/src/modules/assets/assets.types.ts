// /api/assets/products — tab Sản phẩm của trang Tài sản (docs/api/endpoints/assets.md).
import type { ProductPermissions } from '../../lib/product-access';

export const PRODUCT_STATUSES = ['developing', 'active', 'paused', 'discontinued'] as const;
export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export interface ProductPerson {
  id: string;
  fullName: string;
  /** Đã nghỉ (BR-53) → giao diện hiện "Đã nghỉ". */
  isArchived: boolean;
}

export interface Product {
  id: string;
  name: string;
  /** Chỉ http(s) — DB và schema đều chặn link khác. */
  url: string;
  description: string | null;
  status: ProductStatus;
  department: { id: string; name: string };
  project: { id: string; name: string } | null;
  /** Người phụ trách chính. */
  owner: ProductPerson;
  /** Người cùng phụ trách (không gồm người phụ trách chính). */
  members: ProductPerson[];
  updatedAt: string;
  permissions: ProductPermissions;
}

/** Sản phẩm đọc từ DB, trước khi service gắn quyền của người xem. */
export type ProductRecord = Omit<Product, 'permissions'>;

/** Dữ liệu cho form Thêm / Sửa sản phẩm của một phòng. */
export interface ProductFormOptions {
  people: { id: string; fullName: string; departmentName: string | null }[];
  projects: { id: string; name: string }[];
}
