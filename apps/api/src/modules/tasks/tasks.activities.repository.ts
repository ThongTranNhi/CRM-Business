import type { Env } from '../../config/env';
import { rangeParams, type Pagination } from '../../lib/pagination';
import { supabaseList } from '../../lib/supabase';

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
