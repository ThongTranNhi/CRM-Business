import { toPage, type Page, type Pagination } from '../../lib/pagination';
import type { RequestScope } from '../../lib/request-scope';
import { boardPermissions } from '../../lib/work-access';
import { requireTaskAccess, requireWrite } from './tasks.access';
import * as commentsRepository from './tasks.comments.repository';
import type { CommentRow } from './tasks.comments.repository';
import type { AddCommentInput, TaskComment, TaskReply } from './tasks.types';

// Bình luận (task-management.md): ai xem được task thì đọc; ghi được board thì bình luận (canComment,
// BR-41). Trả lời 1 cấp. @mention: người được nhắc nhận thông báo (RPC, Đợt 3 S3).

export async function listComments(
  scope: RequestScope,
  taskId: string,
  pagination: Pagination,
): Promise<Page<TaskComment>> {
  await requireTaskAccess(scope, taskId);
  const { rows, total } = await commentsRepository.listRootComments(scope.env, taskId, pagination);
  const replies = await commentsRepository.listReplies(
    scope.env,
    taskId,
    rows.map((row) => row.id),
  );
  const authorIds = [...new Set([...rows, ...replies].map((row) => row.author_id))];
  const employeeIds = await commentsRepository.findEmployeeIds(scope.env, authorIds);
  const toReply = (row: CommentRow): TaskReply => ({
    id: row.id,
    body: row.body,
    createdAt: row.created_at,
    author: {
      id: row.author_id,
      fullName: row.author_name ?? '',
      employeeId: employeeIds.get(row.author_id) ?? null,
    },
  });
  const comments = rows.map((row) => ({
    ...toReply(row),
    replies: replies.filter((reply) => reply.parent_id === row.id).map(toReply),
  }));
  return toPage(comments, total, pagination);
}

export async function addComment(scope: RequestScope, taskId: string, input: AddCommentInput) {
  const access = await requireTaskAccess(scope, taskId);
  requireWrite(access, boardPermissions(access).canWrite);
  const id = await commentsRepository.addComment(scope.env, scope.actor.id, taskId, input);
  return { id };
}
