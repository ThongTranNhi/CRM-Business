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
  /** Người xem có trong project_members. */
  isMember: boolean;
  /** Người xem được mời vào board của Dashboard phòng dự án (board_members). */
  isBoardMember: boolean;
  /** Phòng ban đã xoá → dự án chỉ xem được (như BR-06). */
  isReadOnly: boolean;
}

export interface ProjectPermissions {
  canView: boolean;
  /** Sửa thông tin dự án: Super Admin, Trưởng phòng của phòng, chủ dự án. */
  canEdit: boolean;
  canManageMembers: boolean;
  /** Đổi chủ dự án: Super Admin, Trưởng phòng của phòng (chủ dự án không tự chuyển). */
  canChangeOwner: boolean;
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
  // Thành viên / chủ dự án chỉ có quyền khi VẪN thuộc phòng dự án hoặc còn trong board của phòng đó:
  // chuyển phòng hay bị bỏ khỏi board là mất quyền, dù còn tên trong project_members.
  const isAttached = viewer.departmentId === project.departmentId || project.isBoardMember;
  const canView =
    canSeeAllProjects(viewer.role) ||
    viewer.departmentId === project.departmentId ||
    (project.isMember && isAttached);
  if (!canView || project.isReadOnly) {
    return {
      canView,
      canEdit: false,
      canManageMembers: false,
      canChangeOwner: false,
      canArchive: false,
    };
  }
  const canArchive = canCreateProject(viewer, project.departmentId);
  const isOwner =
    isAttached && viewer.employeeId !== null && viewer.employeeId === project.ownerEmployeeId;
  const canEdit = canArchive || isOwner;
  return { canView, canEdit, canManageMembers: canEdit, canChangeOwner: canArchive, canArchive };
}
