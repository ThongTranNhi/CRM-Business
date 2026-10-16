import type { Env } from '../../config/env';
import { rangeParams } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import type {
  MyTaskFilters,
  MyTasksQuery,
  MyTaskTab,
  TaskPriority,
  TaskStatus,
} from './tasks.types';

/** Một dòng view my_task_rows (migration 20261011090000, cờ mới ở 20261017090000). */
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

/** Kết quả RPC crm_my_task_counts: số từng tab + 3 số của thẻ Tổng quan. */
export type MyTaskCountsRow = Record<MyTaskTab | 'todo' | 'in_progress' | 'done_this_week', number>;

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

/**
 * Bộ lọc chung của danh sách. `status` dùng `append`: tab Đang mở đã đặt `status=neq.done`, PostgREST AND cả hai.
 */
function applyFilters(params: URLSearchParams, filters: MyTaskFilters) {
  if (filters.status === 'done_week') params.set('is_done_this_week', 'is.true');
  else if (filters.status) params.append('status', `eq.${filters.status}`);
  if (filters.departmentId) params.set('department_id', `eq.${filters.departmentId}`);
  if (filters.priority) params.set('priority', `eq.${filters.priority}`);
  if (filters.projectId) params.set('project_id', `eq.${filters.projectId}`);
  if (filters.q) params.set('title', `ilike.*${filters.q}*`);
}

export function listMyTasks(env: Env, employeeId: string, query: MyTasksQuery) {
  const params = new URLSearchParams({
    select: MY_TASK_SELECT,
    employee_id: `eq.${employeeId}`,
    order: ORDER[query.tab === 'done' ? 'done' : 'open'],
    ...rangeParams(query),
  });
  const [column, filter] = TAB_FILTER[query.tab];
  params.set(column, filter);
  applyFilters(params, query);
  return supabaseList<MyTaskRow>(env, `/rest/v1/my_task_rows?${params}`);
}

/** Việc chưa xong, hạn từ hôm nay tới 6 ngày sau (cờ is_due_soon), hạn gần nhất trước. */
export function listDueSoon(env: Env, employeeId: string, limit: number) {
  const params = new URLSearchParams({
    select: MY_TASK_SELECT,
    employee_id: `eq.${employeeId}`,
    is_due_soon: 'is.true',
    order: 'due_date.asc,title,id',
    limit: String(limit),
  });
  return supabaseRequest<MyTaskRow[]>(env, `/rest/v1/my_task_rows?${params}`);
}

/** Số việc từng tab (và 3 số thẻ Tổng quan) với cùng bộ lọc — một truy vấn. */
export const countMyTasks = (env: Env, employeeId: string, filters: MyTaskFilters = {}) =>
  callRpc<MyTaskCountsRow>(env, {
    name: 'crm_my_task_counts',
    args: {
      employee_uuid: employeeId,
      department_uuid: filters.departmentId ?? null,
      task_priority: filters.priority ?? null,
      project_uuid: filters.projectId ?? null,
      search: filters.q ?? null,
      task_status: filters.status === 'done_week' ? null : (filters.status ?? null),
      done_this_week: filters.status === 'done_week',
    },
  });
