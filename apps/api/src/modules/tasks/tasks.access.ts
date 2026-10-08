import { forbidden } from '../../lib/app-error';
import type { RequestScope } from '../../lib/request-scope';
import { boardPermissions, type WorkAccess } from '../../lib/work-access';
import { boardNotFound, dashboardReadOnly, taskNotFound } from '../../lib/work-errors';
import * as boardRepository from './tasks.board.repository';

// Kiểm tra quyền dùng chung cho các service của module tasks (task, checklist, bình luận, lịch sử).
// Ma trận quyền: docs/architecture/permission-model.md, tính bằng lib/work-access.ts.

export async function requireBoardAccess({ env, actor }: RequestScope, boardId: string) {
  const access = await boardRepository.findWorkAccess(env, actor.id, { boardId });
  if (!access) throw boardNotFound();
  if (!boardPermissions(access).canView) throw forbidden();
  return access;
}

/**
 * null / taskId null → 404. Task đã lưu trữ cũng 404, trừ khi gọi để hoàn tác (`archived: true`
 * thì ngược lại: chỉ task đã lưu trữ).
 */
export async function requireTaskAccess(
  { env, actor }: RequestScope,
  taskId: string,
  { archived = false }: { archived?: boolean } = {},
) {
  const access = await boardRepository.findWorkAccess(env, actor.id, { taskId });
  if (!access?.taskId || access.isArchived !== archived) throw taskNotFound();
  if (!boardPermissions(access).canView) throw forbidden();
  return access;
}

/** Thao tác ghi: Dashboard chỉ đọc (BR-06) → 409 trước, rồi mới tới quyền → 403. */
export function requireWrite(access: WorkAccess, isAllowed: boolean) {
  if (access.isReadOnly) throw dashboardReadOnly();
  if (!isAllowed) throw forbidden();
}
