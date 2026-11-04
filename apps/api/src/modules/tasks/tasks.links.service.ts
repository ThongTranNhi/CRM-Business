import type { RequestScope } from '../../lib/request-scope';
import { taskPermissions } from '../../lib/work-access';
import { requireTaskAccess, requireWrite } from './tasks.access';
import * as linksRepository from './tasks.links.repository';
import type { AddTaskLinkInput } from './tasks.types';

// Link kết quả / tài liệu (chủ dự án chốt 03/11/2026): ai xem được task thì xem; thêm / xoá theo quyền sửa task
// (canEdit) như checklist — Super Admin, Trưởng phòng, Trưởng nhóm, người phụ trách, người phối hợp.

async function requireEdit(scope: RequestScope, taskId: string) {
  const access = await requireTaskAccess(scope, taskId);
  requireWrite(access, taskPermissions(access, access).canEdit);
}

export async function getLinks(scope: RequestScope, taskId: string) {
  await requireTaskAccess(scope, taskId);
  return linksRepository.listLinks(scope.env, taskId);
}

/** Thêm vào cuối; trả danh sách mới (giao diện thay luôn, khỏi tải lại). */
export async function addLink(scope: RequestScope, taskId: string, input: AddTaskLinkInput) {
  await requireEdit(scope, taskId);
  await linksRepository.addLink(scope.env, scope.actor.id, taskId, input);
  return linksRepository.listLinks(scope.env, taskId);
}

export async function removeLink(scope: RequestScope, taskId: string, linkId: string) {
  await requireEdit(scope, taskId);
  await linksRepository.removeLink(scope.env, scope.actor.id, taskId, linkId);
  return linksRepository.listLinks(scope.env, taskId);
}
