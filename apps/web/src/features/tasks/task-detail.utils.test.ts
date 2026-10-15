import { describe, expect, it } from 'vitest';
import {
  applyChecklistChange,
  checklistCounts,
  isDateRangeValid,
  sentenceCase,
  uniqueById,
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
  it('gives every optimistic item a distinct temporary id', () => {
    const once = applyChecklistChange(items, { kind: 'add', content: 'A' });
    const removed = applyChecklistChange(once, { kind: 'remove', itemId: 'i-1' });
    const twice = applyChecklistChange(removed, { kind: 'add', content: 'B' });
    const ids = twice.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('drops rows repeated across offset pages, keeping the newer page', () => {
    const pages = [
      {
        data: [
          { id: 'c-3', body: 'mới' },
          { id: 'c-2', body: 'giữa' },
        ],
      },
      {
        data: [
          { id: 'c-2', body: 'cũ' },
          { id: 'c-1', body: 'đầu' },
        ],
      },
    ];
    expect(uniqueById(pages)).toEqual([
      { id: 'c-3', body: 'mới' },
      { id: 'c-2', body: 'giữa' },
      { id: 'c-1', body: 'đầu' },
    ]);
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
