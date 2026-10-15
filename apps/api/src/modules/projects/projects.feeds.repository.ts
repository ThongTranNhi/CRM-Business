import type { Env } from '../../config/env';
import { rangeParams, type Pagination } from '../../lib/pagination';
import { supabaseList } from '../../lib/supabase';
import type { ProjectTask } from './projects.types';

interface TaskRow {
  id: string;
  title: string;
  status: ProjectTask['status'];
  priority: ProjectTask['priority'];
  due_date: string | null;
  completed_at: string | null;
  assignee_id: string;
  assignee_name: string;
  assignee_archived: boolean;
}

/** Task chưa lưu trữ của dự án trên một board (view task_cards): việc đang mở trước, rồi theo hạn. */
export async function listProjectTasks(
  env: Env,
  projectId: string,
  boardId: string,
  pagination: Pagination,
) {
  const params = new URLSearchParams({
    select:
      'id,title,status,priority,due_date,completed_at,assignee_id,assignee_name,assignee_archived',
    project_id: `eq.${projectId}`,
    board_id: `eq.${boardId}`,
    order: 'status.desc,due_date.asc.nullslast,id',
    ...rangeParams(pagination),
  });
  const { rows, total } = await supabaseList<TaskRow>(env, `/rest/v1/task_cards?${params}`);
  const tasks = rows.map((row): ProjectTask => ({
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    assignee: {
      id: row.assignee_id,
      fullName: row.assignee_name,
      isArchived: row.assignee_archived,
    },
  }));
  return { tasks, total };
}

/** Một dòng view project_activity_feed (audit_logs của dự án). */
export interface ProjectActivityRow {
  id: string;
  action: string;
  old_values: unknown;
  new_values: unknown;
  created_at: string;
  actor_id: string | null;
  actor_name: string | null;
}

/** Lịch sử dự án, mới nhất trước. */
export function listActivities(env: Env, projectId: string, pagination: Pagination) {
  const params = new URLSearchParams({
    select: 'id,action,old_values,new_values,created_at,actor_id,actor_name',
    project_id: `eq.${projectId}`,
    order: 'created_at.desc,id.desc',
    ...rangeParams(pagination),
  });
  return supabaseList<ProjectActivityRow>(env, `/rest/v1/project_activity_feed?${params}`);
}
