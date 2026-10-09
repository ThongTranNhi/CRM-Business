import type { BoardData, BoardTask, ChecklistItem, TaskDetail } from './types';

// Hàm thuần cho drawer chi tiết task: cập nhật cache ngay (optimistic) cho drawer và thẻ trên board.

/** Sửa một thẻ trên board (không có thẻ → giữ nguyên, vd. việc xong cũ chưa tải). */
export function patchBoardTask(
  board: BoardData,
  taskId: string,
  patch: Partial<BoardTask>,
): BoardData {
  return {
    ...board,
    tasks: board.tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)),
  };
}

/** Phần thẻ board lấy từ chi tiết task (tên, ưu tiên, hạn, người phụ trách, người phối hợp, dự án). */
export const cardFieldsOf = (detail: TaskDetail): Partial<BoardTask> => ({
  title: detail.title,
  priority: detail.priority,
  dueDate: detail.dueDate,
  assignee: detail.assignee,
  collaborators: detail.collaborators,
  project: detail.project,
});

/** Số mục checklist x/y trên thẻ (BR-17). */
export const checklistCounts = (items: ChecklistItem[]) => ({
  done: items.filter((item) => item.isDone).length,
  total: items.length,
});

export type ChecklistChange =
  | { kind: 'add'; content: string }
  | { kind: 'update'; itemId: string; content?: string; isDone?: boolean }
  | { kind: 'remove'; itemId: string };

/** Danh sách checklist sau thay đổi, như server sẽ trả (mục mới ở cuối, id tạm không trùng). */
export function applyChecklistChange(items: ChecklistItem[], change: ChecklistChange) {
  if (change.kind === 'add') {
    const last = items.at(-1)?.position ?? 0;
    const temporary = { id: `new-${crypto.randomUUID()}`, content: change.content, isDone: false };
    return [...items, { ...temporary, position: last + 1024 }];
  }
  if (change.kind === 'remove') return items.filter((item) => item.id !== change.itemId);
  return items.map((item) =>
    item.id === change.itemId
      ? {
          ...item,
          content: change.content ?? item.content,
          isDone: change.isDone ?? item.isDone,
        }
      : item,
  );
}

/** "VIỆC ĐANG LÀM" → "Việc đang làm" (câu trong lịch sử, toast). */
export function sentenceCase(text: string): string {
  const lower = text.toLocaleLowerCase('vi-VN');
  return lower.charAt(0).toLocaleUpperCase('vi-VN') + lower.slice(1);
}

/** Hạn ≥ ngày bắt đầu (BR, check tasks_date_range_check). Ngày dạng YYYY-MM-DD so sánh bằng chuỗi. */
export const isDateRangeValid = (startDate: string | null, dueDate: string | null) =>
  !startDate || !dueDate || startDate <= dueDate;

/**
 * Gộp các trang phân trang theo offset, bỏ bản ghi trùng id: có bình luận / hoạt động mới thì các trang
 * sau bị lệch một dòng ("Xem bình luận cũ hơn" trả lại dòng đã có). Giữ lần xuất hiện đầu (trang mới hơn).
 */
export function uniqueById<T extends { id: string }>(pages: { data: T[] }[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of pages.flatMap((page) => page.data)) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}
