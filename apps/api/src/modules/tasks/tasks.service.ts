import type { Env } from '../../config/env';
import { forbidden } from '../../lib/app-error';
import type { RequestScope } from '../../lib/request-scope';
import { boardPermissions, taskPermissions, type WorkAccess } from '../../lib/work-access';
import { boardNotFound, taskNotFound } from '../../lib/work-errors';
import * as boardRepository from './tasks.board.repository';
import * as tasksRepository from './tasks.repository';
import type {
  BoardData,
  BoardTask,
  CreateTaskInput,
  MoveTaskInput,
  TaskCard,
  TaskDetail,
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

/** Quyền của người xem với một thẻ: kéo / đổi cột, xoá (BR-19). */
function withPermissions(access: WorkAccess, card: TaskCard): BoardTask {
  const { createdById, ...rest } = card;
  const permissions = taskPermissions(access, {
    isAssignee: card.assignee.id === access.employeeId,
    isCollaborator: card.collaborators.some((person) => person.id === access.employeeId),
    isCreator: createdById === access.accountId,
  });
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
  if (!boardPermissions(access).canWrite) throw forbidden();
  const taskId = await tasksRepository.createTask(scope.env, scope.actor.id, { boardId, ...input });
  const card = await boardRepository.findCard(scope.env, taskId);
  if (!card) throw taskNotFound();
  return withPermissions(access, card);
}

export async function getTask(scope: RequestScope, taskId: string): Promise<TaskDetail> {
  const access = await requireTaskAccess(scope, taskId);
  const task = await tasksRepository.findTask(scope.env, taskId);
  if (!task) throw taskNotFound();
  const names = await tasksRepository.findAccountNames(
    scope.env,
    [task.createdById, task.completedById].flatMap((id) => (id ? [id] : [])),
  );
  const { completedById, createdById, ...detail } = task;
  const { canEdit, canArchive } = taskPermissions(access, access);
  return {
    ...detail,
    completedBy: completedById ? (names.get(completedById) ?? null) : null,
    createdBy: names.get(createdById) ?? null,
    permissions: { canEdit, canArchive, canComment: boardPermissions(access).canWrite },
  };
}

async function requireEditable(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId);
  if (!taskPermissions(access, access).canEdit) throw forbidden();
}

export async function updateTask(scope: RequestScope, taskId: string, input: UpdateTaskInput) {
  await requireEditable(scope, taskId);
  await tasksRepository.updateTask(scope.env, scope.actor.id, { taskId, ...input });
  return getTask(scope, taskId);
}

/** BR-13 → BR-15: kéo thả lưu DB; position, completed_* do RPC tính. */
export async function moveTask(scope: RequestScope, taskId: string, input: MoveTaskInput) {
  await requireEditable(scope, taskId);
  return tasksRepository.moveTask(scope.env, scope.actor.id, { taskId, ...input });
}

export async function setCollaborators(scope: RequestScope, taskId: string, employeeIds: string[]) {
  await requireEditable(scope, taskId);
  await tasksRepository.setCollaborators(scope.env, scope.actor.id, { taskId, employeeIds });
  return getTask(scope, taskId);
}

/** BR-19: lưu trữ (không xoá) — người tạo, Trưởng phòng, Super Admin. */
export async function archiveTask(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId);
  if (!taskPermissions(access, access).canArchive) throw forbidden();
  await tasksRepository.archiveTask(scope.env, scope.actor.id, taskId);
}

/** Hoàn tác xoá: cùng quyền với xoá; task về cuối cột cũ (RPC crm_restore_task). */
export async function restoreTask(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId, { archived: true });
  if (!taskPermissions(access, access).canArchive) throw forbidden();
  await tasksRepository.restoreTask(scope.env, scope.actor.id, taskId);
  const card = await boardRepository.findCard(scope.env, taskId);
  if (!card) throw taskNotFound();
  return withPermissions(access, card);
}
