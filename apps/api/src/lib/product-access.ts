import type { Role } from '../config/constants';

/**
 * Quyền sản phẩm (tab Sản phẩm ở /app/assets — chủ dự án chốt 17/10/2026). Hàm thuần, có test riêng.
 * Mọi người xem. Super Admin quản lý mọi sản phẩm; Trưởng phòng (role department_manager VÀ đang là trưởng phòng
 * của phòng đó, như Q1) quản lý sản phẩm phòng mình; người phụ trách chính / cùng phụ trách chỉ sửa link và mô tả.
 */
export interface ProductViewer {
  role: Role;
  employeeId: string | null;
  /** Phòng người này đang làm trưởng phòng (null nếu không). */
  managedDepartmentId: string | null;
}

export interface ProductFacts {
  departmentId: string;
  ownerEmployeeId: string;
  memberIds: string[];
}

export interface ProductPermissions {
  /** Sửa mọi trường (tên, trạng thái, dự án, người phụ trách…). */
  canEdit: boolean;
  /** Sửa link và mô tả. */
  canEditContent: boolean;
  /** Xoá (lưu trữ). */
  canArchive: boolean;
}

/** Thêm / quản lý sản phẩm trong một phòng: Super Admin mọi phòng; Trưởng phòng chỉ phòng mình. */
export const canManageProducts = (viewer: ProductViewer, departmentId: string): boolean =>
  viewer.role === 'super_admin' ||
  (viewer.role === 'department_manager' && viewer.managedDepartmentId === departmentId);

export function productPermissions(
  viewer: ProductViewer,
  product: ProductFacts,
): ProductPermissions {
  const canManage = canManageProducts(viewer, product.departmentId);
  const isResponsible =
    viewer.employeeId !== null &&
    (viewer.employeeId === product.ownerEmployeeId ||
      product.memberIds.includes(viewer.employeeId));
  return { canEdit: canManage, canEditContent: canManage || isResponsible, canArchive: canManage };
}
