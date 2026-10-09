import { z } from 'zod';
import {
  isOverdue,
  PRIORITIES,
  type BoardTask,
  type TaskMove,
  type TaskPriority,
} from '@/features/tasks';
import { addDays, startOfWeek } from '@/lib/format-date';
import { normalizeText } from '@/lib/normalize-text';

export const DUE_FILTERS = ['overdue', 'today', 'week'] as const;
export type DueFilter = (typeof DUE_FILTERS)[number];

/**
 * Bộ lọc board, lưu trên URL (`?q=&mine=1&priority=&due=&project=`) để F5 và chia sẻ link giữ nguyên.
 * `project`: id dự án (link [Mở trên board] từ trang dự án).
 */
export interface BoardFilters {
  q: string;
  mine: boolean;
  priority: TaskPriority | null;
  due: DueFilter | null;
  project: string | null;
}

const filtersSchema = z.object({
  q: z.string().catch(''),
  mine: z.literal('1').nullable().catch(null),
  priority: z.enum(PRIORITIES).nullable().catch(null),
  due: z.enum(DUE_FILTERS).nullable().catch(null),
  project: z.uuid().nullable().catch(null),
});

export function readBoardFilters(params: URLSearchParams): BoardFilters {
  const parsed = filtersSchema.parse({
    q: params.get('q') ?? '',
    mine: params.get('mine'),
    priority: params.get('priority'),
    due: params.get('due'),
    project: params.get('project'),
  });
  return { ...parsed, mine: parsed.mine === '1' };
}

export const hasFilters = (filters: BoardFilters): boolean =>
  filters.q !== '' ||
  filters.mine ||
  filters.priority !== null ||
  filters.due !== null ||
  filters.project !== null;

interface FilterContext {
  employeeId: string | null;
  /** YYYY-MM-DD theo giờ Việt Nam. */
  today: string;
}

function matchesDue(task: BoardTask, due: DueFilter, today: string): boolean {
  if (due === 'overdue') return isOverdue(task, today);
  if (!task.dueDate) return false;
  if (due === 'today') return task.dueDate === today;
  const weekStart = startOfWeek(today);
  return task.dueDate >= weekStart && task.dueDate <= addDays(weekStart, 6);
}

/** Tìm theo tên task / người phụ trách (không dấu), "Việc của tôi", ưu tiên, hạn. */
export function matchesFilters(task: BoardTask, filters: BoardFilters, context: FilterContext) {
  const keyword = normalizeText(filters.q);
  if (
    keyword &&
    !normalizeText(task.title).includes(keyword) &&
    !normalizeText(task.assignee.fullName).includes(keyword)
  ) {
    return false;
  }
  const isMine =
    task.assignee.id === context.employeeId ||
    task.collaborators.some((person) => person.id === context.employeeId);
  if (filters.mine && !isMine) return false;
  if (filters.priority && task.priority !== filters.priority) return false;
  if (filters.project && task.project?.id !== filters.project) return false;
  return !filters.due || matchesDue(task, filters.due, context.today);
}

/** Thẻ của một cột theo thứ tự `position`. */
export const columnTasks = (tasks: BoardTask[], columnId: string): BoardTask[] =>
  tasks
    .filter((task) => task.columnId === columnId)
    .sort((a, b) => a.position - b.position || a.id.localeCompare(b.id));

interface TaskRef {
  id: string;
}

/**
 * Task ngay trên / dưới chỗ thả, tính trên danh sách ĐẦY ĐỦ của cột (`full`, đã bỏ thẻ đang kéo) để
 * vị trí đúng cả khi đang lọc. `visible`: thẻ đang hiện (đã lọc, bỏ thẻ đang kéo); `index`: chỗ thả.
 */
export function dropNeighbors(full: TaskRef[], visible: TaskRef[], index: number) {
  const next = visible[index];
  if (next) {
    const nextIndex = full.findIndex((task) => task.id === next.id);
    return { previousTaskId: full[nextIndex - 1]?.id ?? null, nextTaskId: next.id };
  }
  const previous = visible[visible.length - 1];
  if (!previous) return { previousTaskId: full[full.length - 1]?.id ?? null, nextTaskId: null };
  const previousIndex = full.findIndex((task) => task.id === previous.id);
  return { previousTaskId: previous.id, nextTaskId: full[previousIndex + 1]?.id ?? null };
}

/** Chỗ thả theo vị trí con trỏ: trước thẻ đầu tiên có điểm giữa nằm dưới con trỏ. */
export function indexFromPointer(midpoints: number[], pointerY: number): number {
  const index = midpoints.findIndex((midpoint) => pointerY < midpoint);
  return index === -1 ? midpoints.length : index;
}

/** Thả lại đúng chỗ cũ (cùng cột, cùng hai task lân cận) → không gọi API. */
export function isSamePlace(tasks: BoardTask[], move: TaskMove): boolean {
  const column = columnTasks(tasks, move.toColumnId);
  const index = column.findIndex((task) => task.id === move.taskId);
  if (index === -1) return false;
  return (
    (column[index - 1]?.id ?? null) === move.previousTaskId &&
    (column[index + 1]?.id ?? null) === move.nextTaskId
  );
}
