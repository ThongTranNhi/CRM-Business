import { describe, expect, it } from 'vitest';
import {
  applyChecklistChange,
  checklistCounts,
  isDateRangeValid,
  sentenceCase,
} from './task-detail.utils';

const items = [
  { id: 'i-1', content: 'Gọi khách', isDone: true, position: 1024 },
  { id: 'i-2', content: 'Gửi báo giá', isDone: false, position: 2048 },
];

describe('task drawer helpers', () => {
  it('adds a checklist item at the end, unticked', () => {
    const next = applyChecklistChange(items, { kind: 'add', content: 'Ký hợp đồng' });
    expect(next.at(-1)).toMatchObject({ content: 'Ký hợp đồng', isDone: false, position: 3072 });
    expect(checklistCounts(next)).toEqual({ done: 1, total: 3 });
  });
  it('ticks and removes items', () => {
    const ticked = applyChecklistChange(items, { kind: 'update', itemId: 'i-2', isDone: true });
    expect(checklistCounts(ticked)).toEqual({ done: 2, total: 2 });
    expect(applyChecklistChange(items, { kind: 'remove', itemId: 'i-1' })).toHaveLength(1);
  });
  it('sentence-cases Vietnamese column names', () => {
    expect(sentenceCase('ĐÃ HOÀN THÀNH')).toBe('Đã hoàn thành');
  });
  it('accepts a due date on or after the start date only', () => {
    expect(isDateRangeValid('2026-10-08', '2026-10-08')).toBe(true);
    expect(isDateRangeValid('2026-10-09', '2026-10-08')).toBe(false);
    expect(isDateRangeValid(null, '2026-10-08')).toBe(true);
  });
});
