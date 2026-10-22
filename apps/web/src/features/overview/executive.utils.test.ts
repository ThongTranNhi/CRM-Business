import { describe, expect, it } from 'vitest';
import { dueLabel, readPeriod, segmentWidths, taskTotal } from './executive.utils';
import type { DepartmentTaskStats } from './types';

const row = (todo: number, inProgress: number, done: number): DepartmentTaskStats => ({
  department: { id: 'd-1', name: 'Kinh doanh' },
  dashboardId: 'dash-1',
  todo,
  inProgress,
  done,
  overdue: 0,
});

describe('readPeriod', () => {
  it('defaults to month and ignores unknown values', () => {
    expect(readPeriod(new URLSearchParams())).toBe('month');
    expect(readPeriod(new URLSearchParams('period=year'))).toBe('month');
    expect(readPeriod(new URLSearchParams('period=quarter'))).toBe('quarter');
  });
});

describe('segmentWidths', () => {
  it('scales against the busiest department', () => {
    expect(taskTotal(row(2, 1, 1))).toBe(4);
    expect(segmentWidths(row(2, 1, 1), 8)).toEqual({ todo: 25, inProgress: 12.5, done: 12.5 });
  });

  it('is empty when there are no tasks at all', () => {
    expect(segmentWidths(row(0, 0, 0), 0)).toEqual({ todo: 0, inProgress: 0, done: 0 });
  });
});

describe('dueLabel', () => {
  it('reads relative to today', () => {
    expect(dueLabel(0)).toBe('Hôm nay');
    expect(dueLabel(1)).toBe('Ngày mai');
    expect(dueLabel(5)).toBe('Còn 5 ngày');
  });
});
