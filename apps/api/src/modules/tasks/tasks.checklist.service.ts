import type { RequestScope } from '../../lib/request-scope';
import { taskPermissions } from '../../lib/work-access';
import { requireTaskAccess, requireWrite } from './tasks.access';
import * as checklistRepository from './tasks.checklist.repository';
import type { AddChecklistItemInput, UpdateChecklistItemInput } from './tasks.types';

// Checklist (BR-17): ai xem được task thì xem; thêm / sửa / tick / xoá theo quyền sửa task (canEdit) —
// Super Admin, Trưởng phòng, Trưởng nhóm, người phụ trách, người phối hợp.

async function requireEdit(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId);
  requireWrite(access, taskPermissions(access, access).canEdit);
}

export async function getChecklist(scope: RequestScope, taskId: string) {
  await requireTaskAccess(scope, taskId);
  return checklistRepository.listChecklist(scope.env, taskId);
}

/** Thêm vào cuối danh sách; trả danh sách mới (giao diện thay luôn, khỏi tải lại). */
export async function addItem(scope: RequestScope, taskId: string, input: AddChecklistItemInput) {
  await requireEdit(scope, taskId);
  await checklistRepository.addItem(scope.env, scope.actor.id, taskId, input.content);
  return checklistRepository.listChecklist(scope.env, taskId);
}

export async function updateItem(
  scope: RequestScope,
  taskId: string,
  itemId: string,
  input: UpdateChecklistItemInput,
) {
  await requireEdit(scope, taskId);
  await checklistRepository.updateItem(scope.env, scope.actor.id, { taskId, itemId, ...input });
  return checklistRepository.listChecklist(scope.env, taskId);
}

export async function removeItem(scope: RequestScope, taskId: string, itemId: string) {
  await requireEdit(scope, taskId);
  await checklistRepository.removeItem(scope.env, scope.actor.id, taskId, itemId);
  return checklistRepository.listChecklist(scope.env, taskId);
}
