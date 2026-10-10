import type { Env } from '../../config/env';
import { rangeParams, type Pagination } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import { WORK_ERRORS } from '../../lib/work-errors';
import type { AddCommentInput } from './tasks.types';

/** Một dòng view task_comment_feed (author_id = app_accounts.id). */
export interface CommentRow {
  id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  author_id: string;
  author_name: string | null;
}
const COMMENT_SELECT = 'id,parent_id,body,created_at,author_id,author_name';

const feedPath = (filter: Record<string, string>) =>
  `/rest/v1/task_comment_feed?${new URLSearchParams({ select: COMMENT_SELECT, ...filter })}`;

/** Một trang bình luận gốc, mới nhất trước ("Xem bình luận cũ hơn" tải trang sau). */
export function listRootComments(env: Env, taskId: string, pagination: Pagination) {
  return supabaseList<CommentRow>(
    env,
    feedPath({
      task_id: `eq.${taskId}`,
      parent_id: 'is.null',
      order: 'created_at.desc,id.desc',
      ...rangeParams(pagination),
    }),
  );
}

/** Mọi trả lời của các bình luận gốc trong trang (1 truy vấn), cũ trước. */
export async function listReplies(env: Env, taskId: string, parentIds: string[]) {
  if (parentIds.length === 0) return [];
  return supabaseRequest<CommentRow[]>(
    env,
    feedPath({
      task_id: `eq.${taskId}`,
      parent_id: `in.(${parentIds.join(',')})`,
      order: 'created_at,id',
    }),
  );
}

/** app_accounts.id → employees.id (ảnh đại diện lấy theo nhân viên; CEO có thể chưa có hồ sơ). */
export async function findEmployeeIds(env: Env, accountIds: string[]) {
  if (accountIds.length === 0) return new Map<string, string | null>();
  const params = new URLSearchParams({
    select: 'account_id,employee_id',
    account_id: `in.(${accountIds.join(',')})`,
  });
  const rows = await supabaseRequest<{ account_id: string; employee_id: string | null }[]>(
    env,
    `/rest/v1/account_profiles?${params}`,
  );
  return new Map(rows.map((row) => [row.account_id, row.employee_id]));
}

/** Bình luận / trả lời 1 cấp; RPC chặn trả lời vào một trả lời (COMMENT_REPLY_TOO_DEEP). */
export const addComment = (env: Env, actorId: string, taskId: string, input: AddCommentInput) =>
  callRpc<string>(env, {
    name: 'crm_add_comment',
    args: {
      actor_uuid: actorId,
      task_uuid: taskId,
      comment_body: input.body,
      parent_uuid: input.parentId,
      mention_uuids: input.mentionIds,
    },
    errors: WORK_ERRORS,
  });
