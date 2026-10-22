import type { Env } from '../../config/env';
import { rangeParams } from '../../lib/pagination';
import { supabaseList, supabaseRequest } from '../../lib/supabase';
import type { WorkloadQuery } from './workload.schema';
import type { WorkloadRow, WorkloadSort } from './workload.types';

/** Một dòng view employee_workload (migration 20261016090000). */
interface EmployeeWorkloadRow {
  employee_id: string;
  full_name: string;
  department_id: string | null;
  department_name: string | null;
  dashboard_id: string | null;
  todo_count: number;
  in_progress_count: number;
  open_count: number;
  overdue_count: number;
  done_30d_count: number;
}
const WORKLOAD_SELECT =
  'employee_id,full_name,department_id,department_name,dashboard_id,todo_count,in_progress_count,' +
  'open_count,overdue_count,done_30d_count';

const SORT_COLUMN: Record<WorkloadSort, string> = {
  name: 'full_name',
  todo: 'todo_count',
  inProgress: 'in_progress_count',
  open: 'open_count',
  overdue: 'overdue_count',
  done30d: 'done_30d_count',
};

const toWorkloadRow = (row: EmployeeWorkloadRow): WorkloadRow => ({
  employee: { id: row.employee_id, fullName: row.full_name },
  department:
    row.department_id && row.department_name
      ? { id: row.department_id, name: row.department_name }
      : null,
  dashboardId: row.dashboard_id,
  todo: row.todo_count,
  inProgress: row.in_progress_count,
  open: row.open_count,
  overdue: row.overdue_count,
  done30d: row.done_30d_count,
});

/** Cột được chọn trước, rồi tên, rồi id — thứ tự luôn xác định để phân trang không lặp / sót dòng. */
function orderParam({ sort, order }: WorkloadQuery): string {
  const tieBreak = sort === 'name' ? 'employee_id.asc' : 'full_name.asc,employee_id.asc';
  return `${SORT_COLUMN[sort]}.${order},${tieBreak}`;
}

/** Một trang khối lượng việc; `departmentId` null → mọi nhân viên. */
export async function listWorkload(env: Env, query: WorkloadQuery, departmentId: string | null) {
  const params = new URLSearchParams({
    select: WORKLOAD_SELECT,
    order: orderParam(query),
    ...rangeParams(query),
  });
  if (departmentId) params.set('department_id', `eq.${departmentId}`);
  const { rows, total } = await supabaseList<EmployeeWorkloadRow>(
    env,
    `/rest/v1/employee_workload?${params}`,
  );
  return { rows: rows.map(toWorkloadRow), total };
}

/**
 * Tổng quan điều hành: người có việc quá hạn hoặc quá `openLimit` việc đang mở; nhiều việc quá hạn nhất trước.
 * `departmentId` null → mọi nhân viên.
 */
export async function listOverloaded(
  env: Env,
  departmentId: string | null,
  openLimit: number,
  limit: number,
) {
  const params = new URLSearchParams({
    select: WORKLOAD_SELECT,
    or: `(overdue_count.gt.0,open_count.gt.${openLimit})`,
    order: 'overdue_count.desc,open_count.desc,full_name.asc,employee_id.asc',
    limit: String(limit),
  });
  if (departmentId) params.set('department_id', `eq.${departmentId}`);
  const rows = await supabaseRequest<EmployeeWorkloadRow[]>(
    env,
    `/rest/v1/employee_workload?${params}`,
  );
  return rows.map(toWorkloadRow);
}
