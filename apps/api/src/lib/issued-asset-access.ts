import type { Role } from '../config/constants';

/**
 * Quyền tài sản được cấp (tab Tài sản được cấp ở /app/assets — chủ dự án chốt 03/11/2026). Hàm thuần, có test riêng.
 * Super Admin / HR Admin thêm, sửa, xoá, cấp, thu hồi và xem mọi tài sản. Người khác chỉ xem tài sản đang cấp cho
 * chính mình, cho phòng mình hoặc cho cả công ty.
 */
export interface IssuedAssetViewer {
  role: Role;
  employeeId: string | null;
  departmentId: string | null;
}

/** `all`: mọi tài sản. `holder`: chỉ tài sản đang cấp cho công ty, cho phòng `departmentId` hoặc cho `employeeId`. */
export type IssuedAssetScope =
  { kind: 'all' } | { kind: 'holder'; employeeId: string | null; departmentId: string | null };

export const canManageIssuedAssets = (role: Role): boolean =>
  role === 'super_admin' || role === 'hr_admin';

export const issuedAssetScope = (viewer: IssuedAssetViewer): IssuedAssetScope =>
  canManageIssuedAssets(viewer.role)
    ? { kind: 'all' }
    : { kind: 'holder', employeeId: viewer.employeeId, departmentId: viewer.departmentId };
