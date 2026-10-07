import { describe, expect, it } from 'vitest';
import type { BoardTask } from '@/features/tasks';
import {
  columnTasks,
  dropNeighbors,
  indexFromPointer,
  isSamePlace,
  matchesFilters,
  readBoardFilters,
  type BoardFilters,
} from './board.utils';

const refs = (...ids: string[]) => ids.map((id) => ({ id }));

describe('dropNeighbors (positions from the full column)', () => {
  const full = refs('a', 'b', 'c', 'd');

  it('drops at the top of the column', () => {
    expect(dropNeighbors(full, full, 0)).toEqual({ previousTaskId: null, nextTaskId: 'a' });
  });
  it('drops between two tasks', () => {
    expect(dropNeighbors(full, full, 2)).toEqual({ previousTaskId: 'b', nextTaskId: 'c' });
  });
  it('drops at the end of the column', () => {
    expect(dropNeighbors(full, full, 4)).toEqual({ previousTaskId: 'd', nextTaskId: null });
  });
  it('drops into an empty column', () => {
    expect(dropNeighbors([], [], 0)).toEqual({ previousTaskId: null, nextTaskId: null });
  });
  it('uses hidden tasks as neighbours while filtering', () => {
    const visible = refs('b', 'd');
    // Thả trước "d": task ngay trên trong danh sách đầy đủ là "c" (đang bị lọc ẩn).
    expect(dropNeighbors(full, visible, 1)).toEqual({ previousTaskId: 'c', nextTaskId: 'd' });
    // Thả sau thẻ hiện cuối "d": không có task nào sau "d".
    expect(dropNeighbors(full, visible, 2)).toEqual({ previousTaskId: 'd', nextTaskId: null });
    // Lọc ra rỗng: thêm vào cuối cột đầy đủ.
    expect(dropNeighbors(full, [], 0)).toEqual({ previousTaskId: 'd', nextTaskId: null });
  });
});

describe('indexFromPointer', () => {
  it('finds the slot under the pointer', () => {
    expect(indexFromPointer([100, 200, 300], 50)).toBe(0);
    expect(indexFromPointer([100, 200, 300], 250)).toBe(2);
    expect(indexFromPointer([100, 200, 300], 900)).toBe(3);
    expect(indexFromPointer([], 10)).toBe(0);
  });
});

const task = (overrides: Partial<BoardTask>): BoardTask => ({
  id: 't',
  columnId: 'todo',
  status: 'todo',
  title: 'Gọi khách hàng',
  position: 0,
  priority: 'normal',
  dueDate: null,
  completedAt: null,
  assignee: { id: 'e1', fullName: 'Nguyễn Văn An', isArchived: false },
  collaborators: [],
  checklist: { done: 0, total: 0 },
  commentCount: 0,
  canMove: true,
  canArchive: false,
  ...overrides,
});

describe('board filters', () => {
  const context = { employeeId: 'me', today: '2026-10-07' };
  const none: BoardFilters = { q: '', mine: false, priority: null, due: null };

  it('reads valid filters from the URL and ignores bad values', () => {
    const params = new URLSearchParams('q=an&mine=1&priority=urgent&due=nope');
    expect(readBoardFilters(params)).toEqual({
      q: 'an',
      mine: true,
      priority: 'urgent',
      due: null,
    });
  });
  it('searches title and assignee without accents', () => {
    expect(matchesFilters(task({}), { ...none, q: 'goi khach' }, context)).toBe(true);
    expect(matchesFilters(task({}), { ...none, q: 'nguyen van' }, context)).toBe(true);
    expect(matchesFilters(task({}), { ...none, q: 'báo giá' }, context)).toBe(false);
  });
  it('keeps "my tasks" for assignee and collaborators', () => {
    const mine = { ...none, mine: true };
    expect(matchesFilters(task({}), mine, context)).toBe(false);
    expect(
      matchesFilters(task({ collaborators: [{ id: 'me', fullName: 'Tôi' }] }), mine, context),
    ).toBe(true);
  });
  it('filters by due date in Vietnam time (this week = Monday → Sunday)', () => {
    expect(
      matchesFilters(task({ dueDate: '2026-10-06' }), { ...none, due: 'overdue' }, context),
    ).toBe(true);
    expect(
      matchesFilters(task({ dueDate: '2026-10-07' }), { ...none, due: 'today' }, context),
    ).toBe(true);
    expect(matchesFilters(task({ dueDate: '2026-10-11' }), { ...none, due: 'week' }, context)).toBe(
      true,
    );
    expect(matchesFilters(task({ dueDate: '2026-10-12' }), { ...none, due: 'week' }, context)).toBe(
      false,
    );
  });
});

describe('columnTasks', () => {
  it('orders tasks of one column by position', () => {
    const tasks = [
      task({ id: 'b', position: 2 }),
      task({ id: 'a', position: 1 }),
      task({ id: 'x', columnId: 'done' }),
    ];
    expect(columnTasks(tasks, 'todo').map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('isSamePlace', () => {
  const tasks = [
    task({ id: 'a', position: 1 }),
    task({ id: 'b', position: 2 }),
    task({ id: 'c', position: 3 }),
  ];
  const move = (previousTaskId: string | null, nextTaskId: string | null, toColumnId = 'todo') => ({
    taskId: 'b',
    toColumnId,
    previousTaskId,
    nextTaskId,
  });

  it('skips a drop back onto the same spot', () => {
    expect(isSamePlace(tasks, move('a', 'c'))).toBe(true);
  });
  it('detects a real move', () => {
    expect(isSamePlace(tasks, move('c', null))).toBe(false);
    expect(isSamePlace(tasks, move(null, null, 'done'))).toBe(false);
  });
});
