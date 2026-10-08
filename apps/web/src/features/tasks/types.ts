import type { PersonRef } from '@/features/departments';

// Bám response của /api/boards, /api/tasks (docs/api/endpoints/tasks.md).
export type TaskStatus = 'todo' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'normal' | 'high' | 'urgent';

/** Cột kiểu Trello: `status` là nhóm trạng thái của cột (BR-10). */
export interface BoardColumn {
  id: string;
  name: string;
  status: TaskStatus;
  position: number;
}

export interface Assignee extends PersonRef {
  /** BR-53: người phụ trách đã nghỉ. */
  isArchived: boolean;
}

export interface BoardTask {
  id: string;
  columnId: string;
  status: TaskStatus;
  title: string;
  position: number;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  assignee: Assignee;
  collaborators: PersonRef[];
  checklist: { done: number; total: number };
  commentCount: number;
  /** Người xem kéo / đổi cột được thẻ này. */
  canMove: boolean;
  /** Người xem xoá (lưu trữ) được: người tạo, Trưởng phòng, Super Admin (BR-19). */
  canArchive: boolean;
}

export interface BoardData {
  boardId: string;
  columns: BoardColumn[];
  tasks: BoardTask[];
  doneTotal: number;
}

export interface CreateTaskInput {
  title: string;
  assigneeId: string;
  collaboratorIds: string[];
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  description: string | null;
}

/** previousTaskId: task ngay trên chỗ thả; nextTaskId: task ngay dưới (drag-and-drop.md). */
export interface TaskMove {
  taskId: string;
  toColumnId: string;
  previousTaskId: string | null;
  nextTaskId: string | null;
}

/** Một việc trong thùng rác board (GET /api/boards/:boardId/trash). */
export interface TrashTask {
  id: string;
  title: string;
  /** Cột trước khi xoá — khôi phục về cuối cột này. */
  columnName: string;
  archivedAt: string;
  assignee: PersonRef;
  archivedBy: PersonRef | null;
}

export interface TrashParams {
  page: number;
  q: string;
}

/** Người chọn được làm người phụ trách / phối hợp: thành viên phòng + người được mời vào board. */
export interface MemberOption extends PersonRef {
  avatarUrl: string | null;
}

// ---------- Drawer chi tiết task (GET /api/tasks/:id và các mục con) ----------

export interface TaskPermissions {
  canEdit: boolean;
  /** Đổi người phụ trách: Super Admin, Trưởng phòng, Trưởng nhóm, người tạo task. */
  canReassign: boolean;
  canArchive: boolean;
  canComment: boolean;
}

export interface TaskDetail {
  id: string;
  boardId: string;
  columnId: string;
  status: TaskStatus;
  title: string;
  description: string | null;
  priority: TaskPriority;
  startDate: string | null;
  dueDate: string | null;
  startedAt: string | null;
  completedAt: string | null;
  completedBy: PersonRef | null;
  createdBy: PersonRef | null;
  createdAt: string;
  department: { id: string; name: string };
  assignee: Assignee;
  collaborators: PersonRef[];
  permissions: TaskPermissions;
}

/** PATCH /api/tasks/:id: chỉ gửi trường đổi; null = xoá giá trị. */
export interface UpdateTaskInput {
  title?: string;
  assigneeId?: string;
  priority?: TaskPriority;
  startDate?: string | null;
  dueDate?: string | null;
  description?: string | null;
}

export interface ChecklistItem {
  id: string;
  content: string;
  isDone: boolean;
  position: number;
}

/** id = tài khoản người viết; employeeId để lấy ảnh đại diện từ thành viên Dashboard. */
export interface CommentAuthor extends PersonRef {
  employeeId: string | null;
}

export interface TaskReply {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
}

export interface TaskComment extends TaskReply {
  replies: TaskReply[];
}

/** Giá trị trước / sau của một hoạt động (docs/features/work-management/activity-log.md). */
export interface ActivityValue {
  title?: string;
  assignee?: PersonRef;
  collaborators?: PersonRef[];
  priority?: TaskPriority;
  dueDate?: string | null;
  columnName?: string;
  checklistItem?: { content: string; isDone?: boolean };
}

export interface TaskActivity {
  id: string;
  action: string;
  createdAt: string;
  actor: PersonRef | null;
  from: ActivityValue | null;
  to: ActivityValue | null;
}
