import { z } from 'zod';
import type { Env } from '../../config/env';
import { callRpc, supabaseRequest } from '../../lib/supabase';
import { WORK_ERRORS } from '../../lib/work-errors';
import type { PersonRef } from '../departments/departments.types';
import type {
  CreateTaskInput,
  MovedTask,
  MoveTaskInput,
  TaskDetail,
  TaskPriority,
  TaskStatus,
  UpdateTaskInput,
} from './tasks.types';

interface DetailRow {
  id: string;
  board_id: string;
  column_id: string;
  status: TaskStatus;
  title: string;
  description: string | null;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_by: string;
  created_at: string;
  department_id: string;
  departments: { name: string };
  employees: { id: string; full_name: string; archived_at: string | null };
  task_collaborators: { employees: { id: string; full_name: string } }[];
}
const DETAIL_SELECT =
  'id,board_id,column_id,status,title,description,priority,start_date,due_date,started_at,' +
  'completed_at,completed_by,created_by,created_at,department_id,departments(name),' +
  'employees(id,full_name,archived_at),task_collaborators(employees(id,full_name))';

/** Chi tiết task chưa lưu trữ, chưa gồm quyền và tên người tạo / người hoàn thành. */
export type TaskRecord = Omit<TaskDetail, 'permissions' | 'completedBy' | 'createdBy'> & {
  completedById: string | null;
  createdById: string;
};

export async function findTask(env: Env, taskId: string): Promise<TaskRecord | null> {
  const params = new URLSearchParams({
    select: DETAIL_SELECT,
    id: `eq.${taskId}`,
    archived_at: 'is.null',
    limit: '1',
  });
  const [row] = await supabaseRequest<DetailRow[]>(env, `/rest/v1/tasks?${params}`);
  if (!row) return null;
  return {
    id: row.id,
    boardId: row.board_id,
    columnId: row.column_id,
    status: row.status,
    title: row.title,
    description: row.description,
    priority: row.priority,
    startDate: row.start_date,
    dueDate: row.due_date,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    completedById: row.completed_by,
    createdById: row.created_by,
    createdAt: row.created_at,
    department: { id: row.department_id, name: row.departments.name },
    assignee: {
      id: row.employees.id,
      fullName: row.employees.full_name,
      isArchived: row.employees.archived_at !== null,
    },
    collaborators: row.task_collaborators.map(({ employees }) => ({
      id: employees.id,
      fullName: employees.full_name,
    })),
  };
}

/** Tên hiển thị theo app_accounts.id (người tạo, người hoàn thành; CEO có thể chưa có hồ sơ). */
export async function findAccountNames(env: Env, accountIds: string[]) {
  if (accountIds.length === 0) return new Map<string, PersonRef>();
  const params = new URLSearchParams({
    select: 'account_id,display_name',
    account_id: `in.(${accountIds.join(',')})`,
  });
  const rows = await supabaseRequest<{ account_id: string; display_name: string | null }[]>(
    env,
    `/rest/v1/account_profiles?${params}`,
  );
  return new Map(
    rows.map((row) => [row.account_id, { id: row.account_id, fullName: row.display_name ?? '' }]),
  );
}

// ---------- Ghi: mỗi thao tác một RPC (activity ghi cùng giao dịch) ----------

export const createTask = (
  env: Env,
  actorId: string,
  task: { boardId: string } & CreateTaskInput,
) =>
  callRpc<string>(env, {
    name: 'crm_create_task',
    args: {
      actor_uuid: actorId,
      board_uuid: task.boardId,
      task_title: task.title,
      task_description: task.description,
      assignee_uuid: task.assigneeId,
      task_priority: task.priority,
      task_start_date: task.startDate,
      task_due_date: task.dueDate,
      collaborator_uuids: task.collaboratorIds,
    },
    errors: WORK_ERRORS,
  });

/** `changes` giữ nguyên khoá có mặt: RPC chỉ đổi những khoá đó (null = xoá giá trị). */
export const updateTask = (
  env: Env,
  actorId: string,
  change: { taskId: string } & UpdateTaskInput,
) => {
  const { taskId, ...changes } = change;
  return callRpc(env, {
    name: 'crm_update_task',
    args: { actor_uuid: actorId, task_uuid: taskId, changes },
    errors: WORK_ERRORS,
  });
};

const movedTaskSchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
  status: z.enum(['todo', 'in_progress', 'done']),
  position: z.coerce.number(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  completedBy: z.uuid().nullable(),
});

export async function moveTask(
  env: Env,
  actorId: string,
  move: { taskId: string } & MoveTaskInput,
): Promise<MovedTask> {
  const result = await callRpc<unknown>(env, {
    name: 'crm_move_task',
    args: {
      actor_uuid: actorId,
      task_uuid: move.taskId,
      to_column_uuid: move.toColumnId,
      previous_task_uuid: move.previousTaskId,
      next_task_uuid: move.nextTaskId,
    },
    errors: WORK_ERRORS,
  });
  return movedTaskSchema.parse(result);
}

export const setCollaborators = (
  env: Env,
  actorId: string,
  change: { taskId: string; employeeIds: string[] },
) =>
  callRpc(env, {
    name: 'crm_set_task_collaborators',
    args: { actor_uuid: actorId, task_uuid: change.taskId, employee_uuids: change.employeeIds },
    errors: WORK_ERRORS,
  });

export const archiveTask = (env: Env, actorId: string, taskId: string) =>
  callRpc(env, {
    name: 'crm_archive_task',
    args: { actor_uuid: actorId, task_uuid: taskId },
    errors: WORK_ERRORS,
  });

export const restoreTask = (env: Env, actorId: string, taskId: string) =>
  callRpc(env, {
    name: 'crm_restore_task',
    args: { actor_uuid: actorId, task_uuid: taskId },
    errors: WORK_ERRORS,
  });
