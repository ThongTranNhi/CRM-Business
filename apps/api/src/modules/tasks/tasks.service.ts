import type { Env } from '../../config/env';
import { forbidden } from '../../lib/app-error';
import type { RequestScope } from '../../lib/request-scope';
import {
  boardPermissions,
  taskPermissions,
  trashScope,
  type TaskRelation,
  type WorkAccess,
} from '../../lib/work-access';
import { boardNotFound, dashboardReadOnly, taskNotFound } from '../../lib/work-errors';
import * as boardRepository from './tasks.board.repository';
import * as tasksRepository from './tasks.repository';
import * as trashRepository from './tasks.trash.repository';
import type {
  BoardData,
  BoardTask,
  CreateTaskInput,
  MoveTaskInput,
  TaskCard,
  TaskDetail,
  TrashQuery,
  UpdateTaskInput,
} from './tasks.types';

// Ma trận quyền: docs/architecture/permission-model.md (Tạo / Sửa / Kéo thả / Xoá task), tính bằng
// lib/work-access.ts. RPC kiểm tra lại toàn vẹn dữ liệu và BR-06, BR-11 → BR-14, BR-19.

/** Cho module department-dashboards: dữ kiện quyền của người gọi với một board. */
export const getBoardAccess = (env: Env, userId: string, boardId: string) =>
  boardRepository.findWorkAccess(env, userId, { boardId });

async function requireBoardAccess({ env, actor }: RequestScope, boardId: string) {
  const access = await boardRepository.findWorkAccess(env, actor.id, { boardId });
  if (!access) throw boardNotFound();
  if (!boardPermissions(access).canView) throw forbidden();
  return access;
}

/**
 * null / taskId null → 404. Task đã lưu trữ cũng 404, trừ khi gọi để hoàn tác (`archived: true`
 * thì ngược lại: chỉ task đã lưu trữ).
 */
async function requireTaskAccess(
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
function requireWrite(access: WorkAccess, isAllowed: boolean) {
  if (access.isReadOnly) throw dashboardReadOnly();
  if (!isAllowed) throw forbidden();
}

/** Quan hệ của người xem với task, tính từ chính dữ liệu task (không cần gọi lại crm_work_access). */
const relationTo = (
  access: WorkAccess,
  task: Pick<TaskCard, 'assignee' | 'collaborators' | 'createdById'>,
): TaskRelation => ({
  isAssignee: task.assignee.id === access.employeeId,
  isCollaborator: task.collaborators.some((person) => person.id === access.employeeId),
  isCreator: task.createdById === access.accountId,
});

/** Quyền của người xem với một thẻ: kéo / đổi cột, xoá (BR-19). */
function withPermissions(access: WorkAccess, card: TaskCard): BoardTask {
  const { createdById, ...rest } = card;
  const permissions = taskPermissions(access, relationTo(access, { ...card, createdById }));
  return { ...rest, canMove: permissions.canEdit, canArchive: permissions.canArchive };
}

/** 1 request trả cột + việc đang mở + `doneLimit` việc xong gần nhất (department-dashboard.md). */
export async function getBoard(scope: RequestScope, boardId: string, doneLimit: number) {
  const access = await requireBoardAccess(scope, boardId);
  const [columns, openCards, done] = await Promise.all([
    boardRepository.listColumns(scope.env, boardId),
    boardRepository.listOpenCards(scope.env, boardId),
    boardRepository.listDoneCards(scope.env, boardId, doneLimit),
  ]);
  const tasks = [...openCards, ...done.cards].map((card) => withPermissions(access, card));
  return { boardId, columns, tasks, doneTotal: done.total } satisfies BoardData;
}

/** BR-11, BR-12: department_id theo Dashboard (RPC), đúng 1 người phụ trách. */
export async function createTask(scope: RequestScope, boardId: string, input: CreateTaskInput) {
  const access = await requireBoardAccess(scope, boardId);
  requireWrite(access, boardPermissions(access).canWrite);
  const taskId = await tasksRepository.createTask(scope.env, scope.actor.id, { boardId, ...input });
  const card = await boardRepository.findCard(scope.env, taskId);
  if (!card) throw taskNotFound();
  return withPermissions(access, card);
}

async function taskDetail(scope: RequestScope, access: WorkAccess, taskId: string) {
  const task = await tasksRepository.findTask(scope.env, taskId);
  if (!task) throw taskNotFound();
  const names = await tasksRepository.findAccountNames(
    scope.env,
    [task.createdById, task.completedById].flatMap((id) => (id ? [id] : [])),
  );
  const { completedById, createdById, ...detail } = task;
  const { canEdit, canReassign, canArchive } = taskPermissions(access, relationTo(access, task));
  return {
    ...detail,
    completedBy: completedById ? (names.get(completedById) ?? null) : null,
    createdBy: names.get(createdById) ?? null,
    permissions: {
      canEdit,
      canReassign,
      canArchive,
      canComment: boardPermissions(access).canWrite,
    },
  } satisfies TaskDetail;
}

export async function getTask(scope: RequestScope, taskId: string): Promise<TaskDetail> {
  return taskDetail(scope, await requireTaskAccess(scope, taskId), taskId);
}

/** Đổi người phụ trách cần canReassign; các trường khác cần canEdit. */
export async function updateTask(scope: RequestScope, taskId: string, input: UpdateTaskInput) {
  const access = await requireTaskAccess(scope, taskId);
  const permissions = taskPermissions(access, access);
  const { assigneeId, ...otherFields } = input;
  const changesOthers = Object.keys(otherFields).length > 0;
  requireWrite(
    access,
    (assigneeId === undefined || permissions.canReassign) &&
      (!changesOthers || permissions.canEdit),
  );
  await tasksRepository.updateTask(scope.env, scope.actor.id, { taskId, ...input });
  return taskDetail(scope, access, taskId);
}

/** BR-13 → BR-15: kéo thả lưu DB; position, completed_* do RPC tính. */
export async function moveTask(scope: RequestScope, taskId: string, input: MoveTaskInput) {
  const access = await requireTaskAccess(scope, taskId);
  requireWrite(access, taskPermissions(access, access).canEdit);
  return tasksRepository.moveTask(scope.env, scope.actor.id, { taskId, ...input });
}

/** Người phụ trách hiện tại vẫn sửa được người phối hợp (canEdit). */
export async function setCollaborators(scope: RequestScope, taskId: string, employeeIds: string[]) {
  const access = await requireTaskAccess(scope, taskId);
  requireWrite(access, taskPermissions(access, access).canEdit);
  await tasksRepository.setCollaborators(scope.env, scope.actor.id, { taskId, employeeIds });
  return taskDetail(scope, access, taskId);
}

/** BR-19: lưu trữ (không xoá) — người tạo, Trưởng phòng, Super Admin. */
export async function archiveTask(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId);
  requireWrite(access, taskPermissions(access, access).canArchive);
  await tasksRepository.archiveTask(scope.env, scope.actor.id, taskId);
}

/**
 * Thùng rác (không xoá vĩnh viễn — BR-19): chỉ hiện việc người xem khôi phục được (lib/work-access.ts:
 * trashScope). Phòng đã xoá → 409 (BR-06), không ghi được board → 403.
 */
export async function listTrash(scope: RequestScope, boardId: string, query: TrashQuery) {
  const access = await requireBoardAccess(scope, boardId);
  const visible = trashScope(access);
  requireWrite(access, visible !== null);
  const createdBy = visible === 'own' ? access.accountId : null;
  return trashRepository.listTrash(scope.env, { boardId, createdBy, ...query });
}

/** Hoàn tác xoá: cùng quyền với xoá; task về cuối cột cũ (RPC crm_restore_task). */
export async function restoreTask(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId, { archived: true });
  requireWrite(access, taskPermissions(access, access).canArchive);
  await tasksRepository.restoreTask(scope.env, scope.actor.id, taskId);
  const card = await boardRepository.findCard(scope.env, taskId);
  if (!card) throw taskNotFound();
  return withPermissions(access, card);
}
