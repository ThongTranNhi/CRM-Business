import type { BadgeTone } from '@/components/ui';
import { addDays, formatDayMonth } from '@/lib/format-date';
import type { BoardData, BoardTask, TaskMove, TaskPriority, TaskStatus } from './types';

export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

/** BR-18 + docs/ui-ux/colors.md mục 4: Low / Normal / High / Urgent = gray / info / warning / danger. */
export const PRIORITY_META: Record<TaskPriority, { label: string; tone: BadgeTone }> = {
  low: { label: 'Thấp', tone: 'neutral' },
  normal: { label: 'Bình thường', tone: 'info' },
  high: { label: 'Cao', tone: 'warning' },
  urgent: { label: 'Khẩn cấp', tone: 'danger' },
};

const SOON_DAYS = 2;
const POSITION_GAP = 1024;

interface Due {
  dueDate: string | null;
  status: TaskStatus;
}

/** BR-16: quá hạn = hạn trước hôm nay (giờ Việt Nam) và chưa xong. `today`: YYYY-MM-DD. */
export function isOverdue(task: Due, today: string): boolean {
  return task.status !== 'done' && task.dueDate !== null && task.dueDate < today;
}

export interface DueBadge {
  label: string;
  tone: BadgeTone;
  isDone: boolean;
}

/** Badge hạn trên thẻ: success + tick nếu xong, danger nếu quá hạn, warning nếu ≤ 2 ngày. */
export function dueBadge(task: Due, today: string): DueBadge | null {
  if (!task.dueDate) return null;
  const day = formatDayMonth(task.dueDate);
  if (task.status === 'done') return { label: day, tone: 'success', isDone: true };
  if (task.dueDate < today) return { label: `Quá hạn ${day}`, tone: 'danger', isDone: false };
  if (task.dueDate === today) return { label: 'Hạn hôm nay', tone: 'warning', isDone: false };
  if (task.dueDate <= addDays(today, SOON_DAYS)) {
    return { label: `Hạn ${day}`, tone: 'warning', isDone: false };
  }
  return { label: day, tone: 'neutral', isDone: false };
}

/** BR-17: % mục đã xong, làm tròn; không có checklist → null (không hiển thị). */
export function checklistPercent(checklist: { done: number; total: number }): number | null {
  if (checklist.total === 0) return null;
  return Math.round((checklist.done / checklist.total) * 100);
}

function positionBetween(board: BoardData, move: TaskMove): number {
  const positionOf = (id: string | null) => board.tasks.find((task) => task.id === id)?.position;
  const previous = positionOf(move.previousTaskId);
  const next = positionOf(move.nextTaskId);
  if (previous !== undefined && next !== undefined) return (previous + next) / 2;
  if (previous !== undefined) return previous + POSITION_GAP;
  if (next !== undefined) return next - POSITION_GAP;
  const inColumn = board.tasks.filter(
    (task) => task.columnId === move.toColumnId && task.id !== move.taskId,
  );
  return inColumn.length === 0
    ? 0
    : Math.max(...inColumn.map((task) => task.position)) + POSITION_GAP;
}

/**
 * Cập nhật cache ngay khi thả (optimistic): đổi cột, nhóm trạng thái, vị trí như backend sẽ tính
 * (drag-and-drop.md). `now`: ISO thời điểm hiện tại cho completedAt khi sang nhóm done.
 */
export function applyMove(board: BoardData, move: TaskMove, now: string): BoardData {
  const column = board.columns.find((candidate) => candidate.id === move.toColumnId);
  if (!column) return board;
  const position = positionBetween(board, move);
  const moveTask = (task: BoardTask): BoardTask => ({
    ...task,
    columnId: column.id,
    status: column.status,
    position,
    completedAt: column.status === 'done' ? (task.completedAt ?? now) : null,
  });
  return {
    ...board,
    tasks: board.tasks.map((task) => (task.id === move.taskId ? moveTask(task) : task)),
  };
}
