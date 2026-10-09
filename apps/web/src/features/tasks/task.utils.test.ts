import { describe, expect, it } from 'vitest';
import { applyMove, checklistPercent, dueBadge, isOverdue } from './task.utils';
import type { BoardData, BoardTask } from './types';

const TODAY = '2026-10-07';

const task = (id: string, columnId: string, position: number): BoardTask => ({
  id,
  columnId,
  status: columnId === 'done' ? 'done' : 'todo',
  title: id,
  position,
  priority: 'normal',
  dueDate: null,
  completedAt: columnId === 'done' ? '2026-10-01T00:00:00Z' : null,
  assignee: { id: 'e1', fullName: 'An', isArchived: false },
  collaborators: [],
  checklist: { done: 0, total: 0 },
  commentCount: 0,
  project: null,
  canMove: true,
  canArchive: false,
});

const board: BoardData = {
  boardId: 'b1',
  columns: [
    { id: 'todo', name: 'VIỆC CẦN LÀM', status: 'todo', position: 1 },
    { id: 'doing', name: 'VIỆC ĐANG LÀM', status: 'in_progress', position: 2 },
    { id: 'done', name: 'ĐÃ HOÀN THÀNH', status: 'done', position: 3 },
  ],
  tasks: [task('a', 'todo', 0), task('b', 'todo', 1024), task('c', 'done', 0)],
  doneTotal: 1,
};

describe('isOverdue (BR-16)', () => {
  it('is overdue only before today and while not done', () => {
    expect(isOverdue({ dueDate: '2026-10-06', status: 'todo' }, TODAY)).toBe(true);
    expect(isOverdue({ dueDate: TODAY, status: 'todo' }, TODAY)).toBe(false);
    expect(isOverdue({ dueDate: '2026-10-06', status: 'done' }, TODAY)).toBe(false);
    expect(isOverdue({ dueDate: null, status: 'todo' }, TODAY)).toBe(false);
  });
});

describe('dueBadge', () => {
  it('maps the due date to the right tone', () => {
    expect(dueBadge({ dueDate: '2026-10-06', status: 'todo' }, TODAY)?.tone).toBe('danger');
    expect(dueBadge({ dueDate: TODAY, status: 'todo' }, TODAY)?.label).toBe('Hạn hôm nay');
    expect(dueBadge({ dueDate: '2026-10-09', status: 'todo' }, TODAY)?.tone).toBe('warning');
    expect(dueBadge({ dueDate: '2026-10-10', status: 'todo' }, TODAY)?.tone).toBe('neutral');
    expect(dueBadge({ dueDate: '2026-10-01', status: 'done' }, TODAY)).toEqual({
      label: '01/10',
      tone: 'success',
      isDone: true,
    });
    expect(dueBadge({ dueDate: null, status: 'todo' }, TODAY)).toBeNull();
  });
});

describe('checklistPercent (BR-17)', () => {
  it('rounds and hides an empty checklist', () => {
    expect(checklistPercent({ done: 5, total: 7 })).toBe(71);
    expect(checklistPercent({ done: 0, total: 0 })).toBeNull();
  });
});

describe('applyMove (optimistic)', () => {
  const now = '2026-10-07T03:00:00Z';
  const moved = (id: string, result: BoardData) => result.tasks.find((t) => t.id === id);

  it('places a task between two neighbours', () => {
    const result = applyMove(
      board,
      { taskId: 'c', toColumnId: 'todo', previousTaskId: 'a', nextTaskId: 'b' },
      now,
    );
    expect(moved('c', result)).toMatchObject({
      columnId: 'todo',
      status: 'todo',
      position: 512,
      completedAt: null,
    });
  });
  it('appends after the last done task and records completion', () => {
    const result = applyMove(
      board,
      { taskId: 'a', toColumnId: 'done', previousTaskId: 'c', nextTaskId: null },
      now,
    );
    expect(moved('a', result)).toMatchObject({ status: 'done', position: 1024, completedAt: now });
  });
  it('puts a task at the top of a column', () => {
    const result = applyMove(
      board,
      { taskId: 'b', toColumnId: 'todo', previousTaskId: null, nextTaskId: 'a' },
      now,
    );
    expect(moved('b', result)?.position).toBe(-1024);
  });
  it('uses 0 for the first task of an empty column', () => {
    const result = applyMove(
      board,
      { taskId: 'a', toColumnId: 'doing', previousTaskId: null, nextTaskId: null },
      now,
    );
    expect(moved('a', result)).toMatchObject({ status: 'in_progress', position: 0 });
  });
});
