import { toPage, type Pagination } from '../../lib/pagination';
import { findEmployeeNames } from '../../lib/people';
import type { RequestScope } from '../../lib/request-scope';
import * as feedsRepository from './projects.feeds.repository';
import { projectAuditValueSchema } from './projects.schema';
import { loadProject } from './projects.service';
import type { ProjectActivity, ProjectActivityValue } from './projects.types';

// Tab Công việc và Hoạt động của trang dự án: ai xem được dự án thì xem.

/**
 * Task chưa lưu trữ của dự án (giao diện mở board `?task=` bằng dashboardId của dự án). Chỉ task trên board của
 * phòng dự án — ai xem được dự án thì xem được board đó (permission-model.md); phòng chưa có board → rỗng.
 */
export async function listProjectTasks(
  scope: RequestScope,
  projectId: string,
  pagination: Pagination,
) {
  const { project } = await loadProject(scope, projectId);
  if (!project.boardId) return toPage([], 0, pagination);
  const { tasks, total } = await feedsRepository.listProjectTasks(
    scope.env,
    projectId,
    project.boardId,
    pagination,
  );
  return toPage(tasks, total, pagination);
}

type RawValue = NonNullable<ReturnType<typeof projectAuditValueSchema.parse>>;

const parseValue = (raw: unknown): RawValue | null => {
  const parsed = projectAuditValueSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

const peopleIn = (value: RawValue | null) =>
  value
    ? [...(value.ownerEmployeeId ? [value.ownerEmployeeId] : []), ...(value.employeeIds ?? [])]
    : [];

function toValue(value: RawValue | null, names: Map<string, string>): ProjectActivityValue | null {
  if (!value) return null;
  const person = (id: string) => ({ id, fullName: names.get(id) ?? 'Không rõ' });
  const { ownerEmployeeId, employeeIds, taskId, title, ...fields } = value;
  return {
    ...fields,
    ...(ownerEmployeeId !== undefined && {
      owner: ownerEmployeeId ? person(ownerEmployeeId) : null,
    }),
    ...(employeeIds && { members: employeeIds.map(person) }),
    ...(taskId && { task: { id: taskId, title: title ?? '' } }),
  };
}

/** Lịch sử dự án (audit_logs): mới nhất trước; id người đổi thành tên. */
export async function listProjectActivities(
  scope: RequestScope,
  projectId: string,
  pagination: Pagination,
) {
  await loadProject(scope, projectId);
  const { rows, total } = await feedsRepository.listActivities(scope.env, projectId, pagination);
  const parsed = rows.map((row) => ({
    row,
    from: parseValue(row.old_values),
    to: parseValue(row.new_values),
  }));
  const ids = [...new Set(parsed.flatMap(({ from, to }) => [...peopleIn(from), ...peopleIn(to)]))];
  const names = await findEmployeeNames(scope.env, ids);
  const activities = parsed.map(({ row, from, to }): ProjectActivity => ({
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    actor: row.actor_id && row.actor_name ? { id: row.actor_id, fullName: row.actor_name } : null,
    from: toValue(from, names),
    to: toValue(to, names),
  }));
  return toPage(activities, total, pagination);
}
