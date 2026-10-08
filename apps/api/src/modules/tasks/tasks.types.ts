import type { z } from 'zod';
import type { PersonRef } from '../departments/departments.types';
import type {
  addChecklistItemSchema,
  addCommentSchema,
  createTaskSchema,
  movedTaskSchema,
  moveTaskSchema,
  trashQuerySchema,
  updateChecklistItemSchema,
  updateTaskSchema,
} from './tasks.schema';

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type MoveTaskInput = z.infer<typeof moveTaskSchema>;
export type TrashQuery = z.infer<typeof trashQuerySchema>;
export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>;
export type UpdateChecklistItemInput = z.infer<typeof updateChecklistItemSchema>;
export type AddCommentInput = z.infer<typeof addCommentSchema>;

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
  /** BR-53: người phụ trách đã nghỉ → giao diện hiện "Đã nghỉ". */
  isArchived: boolean;
}

/** Thẻ task trên board (view task_cards). Avatar lấy theo id từ danh sách thành viên Dashboard. */
export interface TaskCard {
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
  /** app_accounts.id người tạo — tính quyền xoá (BR-19), không trả ra API. */
  createdById: string;
}

/** Thẻ kèm quyền của người xem: kéo / đổi cột, xoá (lưu trữ). */
export interface BoardTask extends Omit<TaskCard, 'createdById'> {
  canMove: boolean;
  canArchive: boolean;
}

export interface BoardData {
  boardId: string;
  columns: BoardColumn[];
  tasks: BoardTask[];
  /** Tổng số việc Đã hoàn thành (chỉ trả `doneLimit` việc gần nhất). */
  doneTotal: number;
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
  permissions: { canEdit: boolean; canReassign: boolean; canArchive: boolean; canComment: boolean };
}

/** Một việc trong thùng rác (view task_trash): cột cũ, người phụ trách, người xoá. */
export interface TrashTask {
  id: string;
  title: string;
  columnName: string;
  archivedAt: string;
  assignee: PersonRef;
  /** null: không còn activity 'archived' (dữ liệu cũ). */
  archivedBy: PersonRef | null;
}

/** Kết quả crm_move_task. */
export type MovedTask = z.infer<typeof movedTaskSchema>;

// ---------- Drawer chi tiết task: checklist, bình luận, lịch sử ----------

export interface ChecklistItem {
  id: string;
  content: string;
  isDone: boolean;
  position: number;
}

/** Người viết bình luận: id = app_accounts.id; employeeId để giao diện lấy ảnh đại diện (CEO có thể null). */
export interface CommentAuthor extends PersonRef {
  employeeId: string | null;
}

export interface TaskReply {
  id: string;
  body: string;
  createdAt: string;
  author: CommentAuthor;
}

/** Bình luận gốc kèm mọi trả lời (1 cấp), trả lời cũ trước. */
export interface TaskComment extends TaskReply {
  replies: TaskReply[];
}

/** Giá trị trước / sau của một hoạt động, đã đổi id người thành tên (activity-log.md). */
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
