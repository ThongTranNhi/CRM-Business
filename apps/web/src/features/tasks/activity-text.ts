import type { PersonRef } from '@/features/departments';
import { formatDate } from '@/lib/format-date';
import { sentenceCase } from './task-detail.utils';
import { PRIORITY_META } from './task.utils';
import type { ActivityValue, TaskActivity } from './types';

// Câu chữ tiếng Việt cho lịch sử hoạt động (docs/features/work-management/activity-log.md).
// Người thao tác đứng đầu câu; phần còn lại theo hành động.

const names = (people: PersonRef[]) => people.map((person) => person.fullName).join(', ');

const dueText = (value: ActivityValue | null) =>
  value?.dueDate ? formatDate(new Date(`${value.dueDate}T00:00:00+07:00`)) : 'không có hạn';

const priorityText = (value: ActivityValue | null) =>
  value?.priority ? PRIORITY_META[value.priority].label : '—';

function collaboratorsText(from: ActivityValue | null, to: ActivityValue | null): string {
  const before = from?.collaborators ?? [];
  const after = to?.collaborators ?? [];
  const added = after.filter((person) => !before.some((old) => old.id === person.id));
  const removed = before.filter((person) => !after.some((now) => now.id === person.id));
  const parts = [
    added.length > 0 ? `thêm người phối hợp ${names(added)}` : '',
    removed.length > 0 ? `bỏ người phối hợp ${names(removed)}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : 'cập nhật người phối hợp';
}

function checklistText(from: ActivityValue | null, to: ActivityValue | null): string {
  const before = from?.checklistItem;
  const after = to?.checklistItem;
  if (!before && after) return `thêm mục checklist “${after.content}”`;
  if (before && !after) return `xoá mục checklist “${before.content}”`;
  if (!before || !after) return 'cập nhật checklist';
  if (before.content !== after.content) {
    return `sửa mục checklist “${before.content}” → “${after.content}”`;
  }
  return after.isDone ? `đánh dấu xong “${after.content}”` : `bỏ đánh dấu xong “${after.content}”`;
}

type Describe = (from: ActivityValue | null, to: ActivityValue | null) => string;

/** Phần sau tên người thao tác, vd. "chuyển: Việc cần làm → Việc đang làm". */
const DESCRIBE: Record<string, Describe> = {
  created: () => 'tạo công việc',
  assigned: (_from, to) => `giao cho ${to?.assignee?.fullName ?? '—'}`,
  assignee_changed: (from, to) =>
    `đổi người phụ trách: ${from?.assignee?.fullName ?? '—'} → ${to?.assignee?.fullName ?? '—'}`,
  collaborators_changed: collaboratorsText,
  due_date_changed: (from, to) => `đổi hạn: ${dueText(from)} → ${dueText(to)}`,
  priority_changed: (from, to) => `đổi ưu tiên: ${priorityText(from)} → ${priorityText(to)}`,
  checklist_changed: checklistText,
  moved: (from, to) =>
    `chuyển: ${sentenceCase(from?.columnName ?? '—')} → ${sentenceCase(to?.columnName ?? '—')}`,
  completed: () => 'đánh dấu hoàn thành',
  reopened: () => 'mở lại công việc',
  archived: () => 'đã xoá công việc',
  restored: () => 'đã khôi phục công việc',
  title_changed: (from, to) => `đổi tên: “${from?.title ?? ''}” → “${to?.title ?? ''}”`,
  attachment_added: () => 'đính kèm tệp',
  attachment_removed: () => 'gỡ tệp đính kèm',
};

export function activityText({ action, actor, from, to }: TaskActivity): string {
  const describe = DESCRIBE[action] ?? (() => 'cập nhật công việc');
  return `${actor?.fullName ?? 'Ai đó'} ${describe(from, to)}`;
}
