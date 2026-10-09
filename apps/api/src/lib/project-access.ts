import type { Role } from '../config/constants';

/**
 * Quyền dự án (Đợt 3 S1, docs/architecture/permission-model.md). Hàm thuần — service lấy dữ kiện rồi gọi,
 * có test riêng. Trưởng phòng = role department_manager VÀ đang là trưởng phòng của phòng đó (như Q1).
 */
export interface ProjectViewer {
  role: Role;
  employeeId: string | null;
  departmentId: string | null;
  /** Phòng người này đang làm trưởng phòng (null nếu không). */
  managedDepartmentId: string | null;
}

export interface ProjectFacts {
  departmentId: string;
  ownerEmployeeId: string | null;
  /** Người xem là thành viên dự án (kể cả người phòng khác được mời vào board). */
  isMember: boolean;
  /** Phòng ban đã xoá → dự án chỉ xem được (như BR-06). */
  isReadOnly: boolean;
}

export interface ProjectPermissions {
  canView: boolean;
  /** Sửa thông tin dự án: Super Admin, Trưởng phòng của phòng, chủ dự án. */
  canEdit: boolean;
  canManageMembers: boolean;
  /** Lưu trữ / khôi phục: Super Admin, Trưởng phòng của phòng. */
  canArchive: boolean;
}

const isManagerOf = (viewer: ProjectViewer, departmentId: string) =>
  viewer.role === 'department_manager' && viewer.managedDepartmentId === departmentId;

/** Tạo dự án trong một phòng: Super Admin mọi phòng; Trưởng phòng chỉ phòng mình. */
export const canCreateProject = (viewer: ProjectViewer, departmentId: string): boolean =>
  viewer.role === 'super_admin' || isManagerOf(viewer, departmentId);

/** Xem tất cả dự án: Super Admin, HR Admin (HR chỉ đọc). Người khác: phòng mình + dự án mình tham gia. */
export const canSeeAllProjects = (role: Role): boolean =>
  role === 'super_admin' || role === 'hr_admin';

export function projectPermissions(
  viewer: ProjectViewer,
  project: ProjectFacts,
): ProjectPermissions {
  const canView =
    canSeeAllProjects(viewer.role) ||
    viewer.departmentId === project.departmentId ||
    project.isMember;
  if (!canView || project.isReadOnly) {
    return { canView, canEdit: false, canManageMembers: false, canArchive: false };
  }
  const canArchive = canCreateProject(viewer, project.departmentId);
  const isOwner = viewer.employeeId !== null && viewer.employeeId === project.ownerEmployeeId;
  const canEdit = canArchive || isOwner;
  return { canView, canEdit, canManageMembers: canEdit, canArchive };
}
