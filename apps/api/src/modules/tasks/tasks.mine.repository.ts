import type { Env } from '../../config/env';
import { rangeParams } from '../../lib/pagination';
import { callRpc, supabaseList } from '../../lib/supabase';
import type {
  MyTaskCounts,
  MyTasksQuery,
  MyTaskTab,
  TaskPriority,
  TaskStatus,
} from './tasks.types';

/** Một dòng view my_task_rows (migration 20261011090000). */
export interface MyTaskRow {
  id: string;
  is_assignee: boolean;
  column_id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  department_id: string;
  department_name: string;
  dashboard_id: string;
  dashboard_name: string;
  project_id: string | null;
  project_name: string | null;
  checklist_total: number;
  checklist_done: number;
  done_column_id: string | null;
  is_department_member: boolean;
  is_board_member: boolean;
  is_department_manager: boolean;
  is_overdue: boolean;
}
const MY_TASK_SELECT =
  'id,is_assignee,column_id,title,status,priority,due_date,completed_at,department_id,' +
  'department_name,dashboard_id,dashboard_name,project_id,project_name,checklist_total,checklist_done,' +
  'done_column_id,is_department_member,is_board_member,is_department_manager,is_overdue';

/** Điều kiện của từng tab — khớp các cờ trong view và RPC crm_my_task_counts. */
const TAB_FILTER: Record<MyTaskTab, [string, string]> = {
  today: ['is_due_today', 'is.true'],
  week: ['is_due_this_week', 'is.true'],
  overdue: ['is_overdue', 'is.true'],
  open: ['status', 'neq.done'],
  done: ['status', 'eq.done'],
};

/** Việc đang mở: nhóm Đang làm (in_progress) rồi Cần làm (todo), trong nhóm hạn gần nhất trước; Đã xong: xong gần nhất trước. */
const ORDER: Record<'open' | 'done', string> = {
  open: 'status.asc,due_date.asc.nullslast,title,id',
  done: 'completed_at.desc.nullslast,id',
};

export function listMyTasks(env: Env, employeeId: string, query: MyTasksQuery) {
  const params = new URLSearchParams({
    select: MY_TASK_SELECT,
    employee_id: `eq.${employeeId}`,
    order: ORDER[query.tab === 'done' ? 'done' : 'open'],
    ...rangeParams(query),
  });
  const [column, filter] = TAB_FILTER[query.tab];
  params.set(column, filter);
  if (query.departmentId) params.set('department_id', `eq.${query.departmentId}`);
  if (query.priority) params.set('priority', `eq.${query.priority}`);
  if (query.projectId) params.set('project_id', `eq.${query.projectId}`);
  if (query.q) params.set('title', `ilike.*${query.q}*`);
  return supabaseList<MyTaskRow>(env, `/rest/v1/my_task_rows?${params}`);
}

/** Số việc từng tab với cùng bộ lọc — một truy vấn. */
export const countMyTasks = (env: Env, employeeId: string, query: MyTasksQuery) =>
  callRpc<MyTaskCounts>(env, {
    name: 'crm_my_task_counts',
    args: {
      employee_uuid: employeeId,
      department_uuid: query.departmentId ?? null,
      task_priority: query.priority ?? null,
      project_uuid: query.projectId ?? null,
      search: query.q ?? null,
    },
  });
