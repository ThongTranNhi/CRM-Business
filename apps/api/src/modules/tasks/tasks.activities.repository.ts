import type { Env } from '../../config/env';
import { rangeParams, type Pagination } from '../../lib/pagination';
import { supabaseList, supabaseRequest } from '../../lib/supabase';

/** Một dòng view task_activity_feed (actor_id = app_accounts.id). */
export interface ActivityRow {
  id: string;
  action: string;
  from_value: unknown;
  to_value: unknown;
  created_at: string;
  actor_id: string;
  actor_name: string | null;
}

/** Một trang lịch sử, mới nhất trước (activity-log.md). */
export function listActivities(env: Env, taskId: string, pagination: Pagination) {
  const params = new URLSearchParams({
    select: 'id,action,from_value,to_value,created_at,actor_id,actor_name',
    task_id: `eq.${taskId}`,
    order: 'created_at.desc,id.desc',
    ...rangeParams(pagination),
  });
  return supabaseList<ActivityRow>(env, `/rest/v1/task_activity_feed?${params}`);
}

/** Tên nhân viên theo id (gồm người đã nghỉ) — activity chỉ lưu id, tên lấy khi đọc. */
export async function findEmployeeNames(env: Env, employeeIds: string[]) {
  if (employeeIds.length === 0) return new Map<string, string>();
  const params = new URLSearchParams({
    select: 'id,full_name',
    id: `in.(${employeeIds.join(',')})`,
  });
  const rows = await supabaseRequest<{ id: string; full_name: string }[]>(
    env,
    `/rest/v1/employees?${params}`,
  );
  return new Map(rows.map((row) => [row.id, row.full_name]));
}
