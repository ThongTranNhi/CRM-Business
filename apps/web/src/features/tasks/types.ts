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

/** Người chọn được làm người phụ trách / phối hợp: thành viên phòng + người được mời vào board. */
export interface MemberOption extends PersonRef {
  avatarUrl: string | null;
}
