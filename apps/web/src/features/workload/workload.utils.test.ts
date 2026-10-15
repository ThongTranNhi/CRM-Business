import { describe, expect, it } from 'vitest';
import type { WorkloadRow } from './types';
import {
  boardLink,
  isOverloaded,
  nextSort,
  overdueTone,
  readWorkloadParams,
} from './workload.utils';

const row = (overrides: Partial<WorkloadRow> = {}): WorkloadRow => ({
  employee: { id: 'e-1', fullName: 'Nguyễn An' },
  department: { id: 'dep-1', name: 'Kinh doanh' },
  dashboardId: 'dash-1',
  todo: 2,
  inProgress: 1,
  open: 3,
  overdue: 0,
  done30d: 4,
  ...overrides,
});

describe('readWorkloadParams', () => {
  it('defaults to most open tasks first, page 1', () => {
    expect(readWorkloadParams(new URLSearchParams())).toEqual({
      departmentId: '',
      sort: 'open',
      order: 'desc',
      page: 1,
    });
  });
  it('sorts names A → Z by default and ignores bad values', () => {
    expect(readWorkloadParams(new URLSearchParams('sort=name&order=up&page=0'))).toMatchObject({
      sort: 'name',
      order: 'asc',
      page: 1,
    });
    expect(readWorkloadParams(new URLSearchParams('sort=salary')).sort).toBe('open');
  });
});

describe('nextSort', () => {
  it('flips the order of the current column', () => {
    expect(nextSort({ sort: 'open', order: 'desc' }, 'open')).toEqual({
      sort: 'open',
      order: 'asc',
    });
  });
  it('uses the default order of a new column', () => {
    expect(nextSort({ sort: 'open', order: 'asc' }, 'name')).toEqual({
      sort: 'name',
      order: 'asc',
    });
    expect(nextSort({ sort: 'name', order: 'asc' }, 'overdue')).toEqual({
      sort: 'overdue',
      order: 'desc',
    });
  });
});

describe('load colours', () => {
  it('marks overdue tasks danger and more than 10 open tasks overloaded', () => {
    expect(overdueTone(row({ overdue: 1 }))).toBe('danger');
    expect(overdueTone(row())).toBeNull();
    expect(isOverloaded(row({ open: 11 }))).toBe(true);
    expect(isOverloaded(row({ open: 10 }))).toBe(false);
  });
});

describe('boardLink', () => {
  it('opens the department board filtered by main assignee and group', () => {
    expect(boardLink(row(), 'in_progress')).toBe(
      '/app/workspace/dash-1?assignee=e-1&status=in_progress',
    );
    expect(boardLink(row(), 'overdue')).toBe('/app/workspace/dash-1?assignee=e-1&due=overdue');
  });
  it('has no link when the department has no Dashboard', () => {
    expect(boardLink(row({ dashboardId: null }), 'todo')).toBeNull();
  });
});
