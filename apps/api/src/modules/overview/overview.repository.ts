import type { Env } from '../../config/env';
import { callRpc, supabaseRequest } from '../../lib/supabase';
import type { DepartmentTaskStats, OverviewPeriod, UpcomingTask } from './overview.types';

/** Một dòng crm_executive_task_stats (migration 20261023090000). */
interface TaskStatsRow {
  department_id: string;
  department_name: string;
  dashboard_id: string | null;
  todo_count: number;
  in_progress_count: number;
  done_count: number;
  overdue_count: number;
}

/** Việc tạo trong kỳ, theo phòng; `departmentId` null → mọi phòng. */
export async function listDepartmentStats(
  env: Env,
  period: OverviewPeriod,
  departmentId: string | null,
): Promise<DepartmentTaskStats[]> {
  const rows = await callRpc<TaskStatsRow[]>(env, {
    name: 'crm_executive_task_stats',
    args: { period, department_uuid: departmentId },
  });
  return rows.map((row) => ({
    department: { id: row.department_id, name: row.department_name },
    dashboardId: row.dashboard_id,
    todo: row.todo_count,
    inProgress: row.in_progress_count,
    done: row.done_count,
    overdue: row.overdue_count,
  }));
}

/** Một dòng view upcoming_task_rows. */
interface UpcomingRow {
  id: string;
  title: string;
  status: UpcomingTask['status'];
  priority: UpcomingTask['priority'];
  due_date: string;
  days_left: number;
  department_id: string;
  department_name: string;
  dashboard_id: string;
  assignee_id: string;
  assignee_name: string;
}
const UPCOMING_SELECT =
  'id,title,status,priority,due_date,days_left,department_id,department_name,dashboard_id,assignee_id,' +
  'assignee_name';

/** Việc chưa xong hạn trong `days` ngày tới (kể cả hôm nay); hạn gần nhất trước. */
export async function listUpcoming(
  env: Env,
  departmentId: string | null,
  days: number,
  limit: number,
): Promise<UpcomingTask[]> {
  const params = new URLSearchParams({
    select: UPCOMING_SELECT,
    and: `(days_left.gte.0,days_left.lt.${days})`,
    order: 'due_date.asc,title.asc,id.asc',
    limit: String(limit),
  });
  if (departmentId) params.set('department_id', `eq.${departmentId}`);
  const rows = await supabaseRequest<UpcomingRow[]>(env, `/rest/v1/upcoming_task_rows?${params}`);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    daysLeft: row.days_left,
    department: { id: row.department_id, name: row.department_name },
    dashboardId: row.dashboard_id,
    assignee: { id: row.assignee_id, fullName: row.assignee_name },
  }));
}
