import type { Env } from '../../config/env';
import { callRpc, supabaseRequest } from '../../lib/supabase';
import { WORK_ERRORS } from '../../lib/work-errors';
import type { AddTaskLinkInput, TaskLink } from './tasks.types';

interface LinkRow {
  id: string;
  url: string;
  title: string | null;
  created_at: string;
}

/** Link chưa xoá của một task, cũ trước (tối đa 10 — RPC chặn). */
export async function listLinks(env: Env, taskId: string): Promise<TaskLink[]> {
  const params = new URLSearchParams({
    select: 'id,url,title,created_at',
    task_id: `eq.${taskId}`,
    deleted_at: 'is.null',
    order: 'created_at,id',
  });
  const rows = await supabaseRequest<LinkRow[]>(env, `/rest/v1/task_links?${params}`);
  return rows.map((row) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    createdAt: row.created_at,
  }));
}

// Ghi qua RPC: ghi activity attachment_added / attachment_removed cùng giao dịch (BR-20).

export const addLink = (env: Env, actorId: string, taskId: string, input: AddTaskLinkInput) =>
  callRpc<string>(env, {
    name: 'crm_add_task_link',
    args: { actor_uuid: actorId, task_uuid: taskId, link_url: input.url, link_title: input.title },
    errors: WORK_ERRORS,
  });

/** Xoá mềm (deleted_at). */
export const removeLink = (env: Env, actorId: string, taskId: string, linkId: string) =>
  callRpc(env, {
    name: 'crm_remove_task_link',
    args: { actor_uuid: actorId, task_uuid: taskId, link_uuid: linkId },
    errors: WORK_ERRORS,
  });
