import { toPage, type Pagination } from '../../lib/pagination';
import { findEmployeeNames } from '../../lib/people';
import type { RequestScope } from '../../lib/request-scope';
import { requireTaskAccess } from './tasks.access';
import * as activitiesRepository from './tasks.activities.repository';
import { activityValueSchema } from './tasks.schema';
import type { ActivityValue, TaskActivity } from './tasks.types';

// Lịch sử hoạt động (activity-log.md, BR-20, BR-21): ai xem được task thì xem. Câu chữ tiếng Việt do
// giao diện ghép; API đổi id người trong from / to thành tên.

type RawValue = NonNullable<ReturnType<typeof activityValueSchema.parse>>;

const parseValue = (raw: unknown): RawValue | null => {
  const parsed = activityValueSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
};

const employeeIdsOf = (value: RawValue | null) =>
  value ? [...(value.assigneeId ? [value.assigneeId] : []), ...(value.employeeIds ?? [])] : [];

function toValue(value: RawValue | null, names: Map<string, string>): ActivityValue | null {
  if (!value) return null;
  const person = (id: string) => ({ id, fullName: names.get(id) ?? 'Không rõ' });
  const result: ActivityValue = {};
  if (value.title !== undefined) result.title = value.title;
  if (value.assigneeId) result.assignee = person(value.assigneeId);
  if (value.employeeIds) result.collaborators = value.employeeIds.map(person);
  if (value.priority) result.priority = value.priority;
  if (value.dueDate !== undefined) result.dueDate = value.dueDate;
  if (value.columnName) result.columnName = value.columnName;
  if (value.projectId) result.project = { id: value.projectId, name: value.projectName ?? '' };
  if (value.content !== undefined) {
    result.checklistItem =
      value.isDone === undefined
        ? { content: value.content }
        : { content: value.content, isDone: value.isDone };
  }
  return result;
}

export async function listActivities(scope: RequestScope, taskId: string, pagination: Pagination) {
  await requireTaskAccess(scope, taskId);
  const { rows, total } = await activitiesRepository.listActivities(scope.env, taskId, pagination);
  const parsed = rows.map((row) => ({
    row,
    from: parseValue(row.from_value),
    to: parseValue(row.to_value),
  }));
  const employeeIds = [
    ...new Set(parsed.flatMap(({ from, to }) => [...employeeIdsOf(from), ...employeeIdsOf(to)])),
  ];
  const names = await findEmployeeNames(scope.env, employeeIds);
  const activities = parsed.map(({ row, from, to }): TaskActivity => ({
    id: row.id,
    action: row.action,
    createdAt: row.created_at,
    actor: row.actor_name ? { id: row.actor_id, fullName: row.actor_name } : null,
    from: toValue(from, names),
    to: toValue(to, names),
  }));
  return toPage(activities, total, pagination);
}
