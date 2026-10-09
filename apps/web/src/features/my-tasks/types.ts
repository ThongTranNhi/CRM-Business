import type { PageMeta } from '@/lib/api-client';
import type { TaskPriority, TaskStatus } from '@/features/tasks';

export const MY_TASK_TABS = ['today', 'week', 'overdue', 'open', 'done'] as const;
export type MyTaskTab = (typeof MY_TASK_TABS)[number];

/** Một dòng Việc của tôi (docs/api/endpoints/tasks.md — GET /api/tasks/mine). */
export interface MyTask {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  completedAt: string | null;
  /** 'collaborator' → nhãn "Phối hợp". */
  role: 'assignee' | 'collaborator';
  department: { id: string; name: string };
  dashboard: { id: string; name: string };
  project: { id: string; name: string } | null;
  checklist: { done: number; total: number };
  columnId: string;
  /** Đích của checkbox hoàn thành nhanh; null → không hiện checkbox. */
  doneColumnId: string | null;
  canEdit: boolean;
}

export type MyTaskCounts = Record<MyTaskTab, number>;

export interface MyTasksMeta extends PageMeta {
  counts: MyTaskCounts;
}

/** Bộ lọc trên URL: `?tab=&department=&priority=&project=&q=&page=`. */
export interface MyTaskParams {
  tab: MyTaskTab;
  departmentId: string;
  priority: TaskPriority | '';
  projectId: string;
  q: string;
  page: number;
}
