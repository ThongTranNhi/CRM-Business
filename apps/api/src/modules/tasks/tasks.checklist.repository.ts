import type { Env } from '../../config/env';
import { callRpc, supabaseRequest } from '../../lib/supabase';
import { WORK_ERRORS } from '../../lib/work-errors';
import type { ChecklistItem, UpdateChecklistItemInput } from './tasks.types';

interface ChecklistRow {
  id: string;
  content: string;
  is_done: boolean;
  position: number;
}

/** Mục checklist chưa xoá của một task, theo thứ tự (BR-17). */
export async function listChecklist(env: Env, taskId: string): Promise<ChecklistItem[]> {
  const params = new URLSearchParams({
    select: 'id,content,is_done,position',
    task_id: `eq.${taskId}`,
    deleted_at: 'is.null',
    order: 'position,id',
  });
  const rows = await supabaseRequest<ChecklistRow[]>(
    env,
    `/rest/v1/task_checklist_items?${params}`,
  );
  return rows.map((row) => ({
    id: row.id,
    content: row.content,
    isDone: row.is_done,
    position: Number(row.position),
  }));
}

// Ghi qua RPC: ghi activity checklist_changed cùng giao dịch (BR-20).

export const addItem = (env: Env, actorId: string, taskId: string, content: string) =>
  callRpc<string>(env, {
    name: 'crm_add_checklist_item',
    args: { actor_uuid: actorId, task_uuid: taskId, item_content: content },
    errors: WORK_ERRORS,
  });

/** Trường không gửi → null: RPC giữ nguyên giá trị cũ. */
export const updateItem = (
  env: Env,
  actorId: string,
  change: { taskId: string; itemId: string } & UpdateChecklistItemInput,
) =>
  callRpc(env, {
    name: 'crm_update_checklist_item',
    args: {
      actor_uuid: actorId,
      task_uuid: change.taskId,
      item_uuid: change.itemId,
      item_content: change.content ?? null,
      item_done: change.isDone ?? null,
    },
    errors: WORK_ERRORS,
  });

/** Xoá mềm (deleted_at). */
export const removeItem = (env: Env, actorId: string, taskId: string, itemId: string) =>
  callRpc(env, {
    name: 'crm_remove_checklist_item',
    args: { actor_uuid: actorId, task_uuid: taskId, item_uuid: itemId },
    errors: WORK_ERRORS,
  });
