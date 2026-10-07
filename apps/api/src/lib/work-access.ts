import { z } from 'zod';
import { ROLES, type Role } from '../config/constants';

/**
 * Quyền Work Management theo docs/architecture/permission-model.md. Hàm thuần: dữ liệu lấy từ RPC
 * crm_work_access, service gọi các hàm này rồi ném 403. Dùng chung cho department-dashboards và tasks.
 */
export const workAccessSchema = z.object({
  accountId: z.uuid(),
  role: z.enum(ROLES),
  employeeId: z.uuid().nullable(),
  boardId: z.uuid(),
  departmentId: z.uuid(),
  isReadOnly: z.boolean(),
  isDepartmentMember: z.boolean(),
  isDepartmentManager: z.boolean(),
  isBoardMember: z.boolean(),
  taskId: z.uuid().nullable(),
  /** Task đã lưu trữ (20261007090000); bản RPC cũ không trả trường này → false. */
  isArchived: z.boolean().default(false),
  isAssignee: z.boolean(),
  isCollaborator: z.boolean(),
  isCreator: z.boolean(),
});

export type WorkAccess = z.infer<typeof workAccessSchema>;

/** Người xem và board: những gì không phụ thuộc một task cụ thể. */
export type BoardViewer = Pick<
  WorkAccess,
  'role' | 'isReadOnly' | 'isDepartmentMember' | 'isDepartmentManager' | 'isBoardMember'
>;

/** Quan hệ của người xem với một task. */
export type TaskRelation = Pick<WorkAccess, 'isAssignee' | 'isCollaborator' | 'isCreator'>;

export interface BoardPermissions {
  canView: boolean;
  /** Tạo task, bình luận (BR-41; HR Admin chỉ đọc trừ khi là thành viên board). */
  canWrite: boolean;
  /** Sửa / kéo mọi task của board: Super Admin, Trưởng phòng, Trưởng nhóm trong phòng. */
  canEditAllTasks: boolean;
}

export interface TaskPermissions {
  canEdit: boolean;
  /** Đổi người phụ trách: Super Admin, Trưởng phòng, Trưởng nhóm của phòng, người tạo task. */
  canReassign: boolean;
  canArchive: boolean;
}

/** Q1: Trưởng phòng = role department_manager VÀ là manager_employee_id của phòng. */
export const isManagerOf = (viewer: BoardViewer): boolean =>
  viewer.role === 'department_manager' && viewer.isDepartmentManager;

const isMember = (viewer: BoardViewer): boolean =>
  viewer.isDepartmentMember || viewer.isBoardMember;

export function boardPermissions(viewer: BoardViewer): BoardPermissions {
  const isSuperAdmin = viewer.role === 'super_admin';
  const canView = isSuperAdmin || viewer.role === 'hr_admin' || isMember(viewer);
  // BR-06: phòng ban đã xoá → Dashboard chỉ đọc với mọi người.
  if (viewer.isReadOnly) return { canView, canWrite: false, canEditAllTasks: false };
  const canEditAllTasks =
    isSuperAdmin ||
    isManagerOf(viewer) ||
    (viewer.role === 'team_leader' && viewer.isDepartmentMember);
  return { canView, canWrite: canEditAllTasks || isMember(viewer), canEditAllTasks };
}

export function taskPermissions(viewer: BoardViewer, relation: TaskRelation): TaskPermissions {
  const board = boardPermissions(viewer);
  const isInvolved = relation.isAssignee || relation.isCollaborator;
  return {
    canEdit: board.canEditAllTasks || (board.canWrite && isInvolved),
    canReassign: board.canEditAllTasks || (board.canWrite && relation.isCreator),
    // BR-19: người tạo, Trưởng phòng, Super Admin.
    canArchive:
      board.canWrite &&
      (viewer.role === 'super_admin' || isManagerOf(viewer) || relation.isCreator),
  };
}

/** BR-05: Super Admin mọi phòng; Trưởng phòng chỉ phòng mình quản lý. */
export function canCreateDashboard(
  role: Role,
  departmentId: string,
  managedDepartmentId: string | null,
): boolean {
  if (role === 'super_admin') return true;
  return role === 'department_manager' && managedDepartmentId === departmentId;
}
