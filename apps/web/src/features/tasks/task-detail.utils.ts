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

/** Phần thẻ board lấy từ chi tiết task (tên, ưu tiên, hạn, người phụ trách, người phối hợp). */
export const cardFieldsOf = (detail: TaskDetail): Partial<BoardTask> => ({
  title: detail.title,
  priority: detail.priority,
  dueDate: detail.dueDate,
  assignee: detail.assignee,
  collaborators: detail.collaborators,
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

/** Danh sách checklist sau thay đổi, như server sẽ trả (mục mới ở cuối, id tạm). */
export function applyChecklistChange(items: ChecklistItem[], change: ChecklistChange) {
  if (change.kind === 'add') {
    const last = items.at(-1)?.position ?? 0;
    const temporary = { id: `new-${items.length}`, content: change.content, isDone: false };
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
