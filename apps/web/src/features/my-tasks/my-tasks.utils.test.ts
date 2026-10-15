import { describe, expect, it } from 'vitest';
import {
  canComplete,
  groupByStatus,
  hasFilters,
  readMyTaskParams,
  tabLabel,
  taskLink,
} from './my-tasks.utils';
import type { MyTask } from './types';

const task = (facts: Partial<MyTask> = {}): MyTask => ({
  id: 't-1',
  title: 'Viết báo cáo',
  status: 'todo',
  priority: 'normal',
  dueDate: null,
  completedAt: null,
  role: 'assignee',
  department: { id: 'd-1', name: 'Phòng' },
  dashboard: { id: 'dash-1', name: 'Dashboard' },
  project: null,
  checklist: { done: 0, total: 0 },
  columnId: 'c-todo',
  doneColumnId: 'c-done',
  canEdit: true,
  ...facts,
});

describe('readMyTaskParams', () => {
  it('defaults to Hôm nay and ignores invalid values', () => {
    const params = readMyTaskParams(new URLSearchParams('tab=later&priority=max&page=-2'));
    expect(params).toEqual({
      tab: 'today',
      departmentId: '',
      priority: '',
      projectId: '',
      q: '',
      page: 1,
    });
  });
  it('reads filters from the URL', () => {
    const params = readMyTaskParams(
      new URLSearchParams('tab=done&department=d-1&priority=urgent&project=p-1&q=báo&page=3'),
    );
    expect(params).toMatchObject({ tab: 'done', priority: 'urgent', projectId: 'p-1', page: 3 });
    expect(hasFilters(params)).toBe(true);
  });
});

describe('my task rows', () => {
  it('labels tabs with counts', () => {
    expect(tabLabel('overdue', { today: 0, week: 0, overdue: 4, open: 9, done: 1 })).toBe(
      'Quá hạn (4)',
    );
    expect(tabLabel('overdue', undefined)).toBe('Quá hạn');
  });
  it('groups rows by status: Đang làm, Cần làm, Đã xong', () => {
    const groups = groupByStatus([
      task({ id: 'a', status: 'todo' }),
      task({ id: 'b', status: 'done' }),
      task({ id: 'c', status: 'in_progress' }),
    ]);
    expect(groups.map((group) => group.status)).toEqual(['in_progress', 'todo', 'done']);
  });
  it('links to the board drawer', () => {
    expect(taskLink(task())).toBe('/app/workspace/dash-1?task=t-1');
  });
  it('shows the quick-complete checkbox only when allowed', () => {
    expect(canComplete(task())).toBe(true);
    expect(canComplete(task({ canEdit: false }))).toBe(false);
    expect(canComplete(task({ status: 'done' }))).toBe(false);
    expect(canComplete(task({ doneColumnId: null }))).toBe(false);
  });
});
