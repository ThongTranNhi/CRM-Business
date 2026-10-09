import type { PersonRef } from '@/features/departments';
import { formatIsoDate, PROJECT_STATUS_META } from './project.utils';
import type { ProjectActivity, ProjectActivityValue } from './types';

// Câu chữ tiếng Việt cho lịch sử dự án (audit_logs, migration 20261009090000). Người thao tác đứng đầu.

type Value = ProjectActivityValue | null;

const names = (people: PersonRef[]) => people.map((person) => person.fullName).join(', ');
const dateText = (isoDate: string | null | undefined) =>
  isoDate ? formatIsoDate(isoDate) : 'không có';

/** Từng trường đổi trong 'project.update', nối bằng "; ". */
function updateText(from: Value, to: Value): string {
  if (!from || !to) return 'cập nhật dự án';
  const parts = [
    from.name !== to.name ? `đổi tên: “${from.name ?? ''}” → “${to.name ?? ''}”` : '',
    from.status !== to.status && from.status && to.status
      ? `đổi trạng thái: ${PROJECT_STATUS_META[from.status].label} → ${PROJECT_STATUS_META[to.status].label}`
      : '',
    from.owner?.id !== to.owner?.id
      ? `đổi chủ dự án: ${from.owner?.fullName ?? 'chưa có'} → ${to.owner?.fullName ?? 'chưa có'}`
      : '',
    from.startDate !== to.startDate
      ? `đổi ngày bắt đầu: ${dateText(from.startDate)} → ${dateText(to.startDate)}`
      : '',
    from.dueDate !== to.dueDate
      ? `đổi hạn: ${dateText(from.dueDate)} → ${dateText(to.dueDate)}`
      : '',
    from.description !== to.description ? 'sửa mô tả' : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : 'cập nhật dự án';
}

function membersText(from: Value, to: Value): string {
  const before = from?.members ?? [];
  const after = to?.members ?? [];
  const added = after.filter((person) => !before.some((old) => old.id === person.id));
  const removed = before.filter((person) => !after.some((now) => now.id === person.id));
  const parts = [
    added.length > 0 ? `thêm thành viên ${names(added)}` : '',
    removed.length > 0 ? `bỏ thành viên ${names(removed)}` : '',
  ].filter(Boolean);
  return parts.length > 0 ? parts.join('; ') : 'cập nhật thành viên';
}

const DESCRIBE: Record<string, (from: Value, to: Value) => string> = {
  'project.create': (_from, to) => `tạo dự án “${to?.name ?? ''}”`,
  'project.update': updateText,
  'project.members': membersText,
  'project.archive': () => 'lưu trữ dự án',
  'project.restore': () => 'khôi phục dự án',
  'project.task_added': (_from, to) => `thêm công việc “${to?.task?.title ?? ''}” vào dự án`,
  'project.task_removed': (from) => `bỏ công việc “${from?.task?.title ?? ''}” khỏi dự án`,
};

export function projectActivityText({ action, actor, from, to }: ProjectActivity): string {
  const describe = DESCRIBE[action] ?? (() => 'cập nhật dự án');
  return `${actor?.fullName ?? 'Ai đó'} ${describe(from, to)}`;
}
