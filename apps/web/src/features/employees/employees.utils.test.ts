import { describe, expect, it } from 'vitest';
import { handedOverText, handoverScopeText } from './employees.utils';

const result = (handedOverTaskCount: number, handedOverProjectCount: number) => ({
  deleted: true as const,
  openTaskCount: handedOverTaskCount,
  handedOverTaskCount,
  ownedProjectCount: handedOverProjectCount,
  handedOverProjectCount,
});

describe('handoverScopeText', () => {
  it('nêu việc và dự án cần bàn giao', () => {
    expect(handoverScopeText({ openTaskCount: 3, ownedProjectCount: 2 })).toBe(
      'phụ trách 3 việc chưa xong và làm chủ 2 dự án',
    );
  });

  it('bỏ phần bằng 0', () => {
    expect(handoverScopeText({ openTaskCount: 0, ownedProjectCount: 1 })).toBe('làm chủ 1 dự án');
    expect(handoverScopeText({ openTaskCount: 4, ownedProjectCount: 0 })).toBe(
      'phụ trách 4 việc chưa xong',
    );
  });
});

describe('handedOverText', () => {
  it('nêu số đã bàn giao và người nhận', () => {
    expect(handedOverText(result(3, 2), 'An')).toBe(', bàn giao 3 việc và 2 dự án cho An');
    expect(handedOverText(result(0, 1), 'An')).toBe(', bàn giao 1 dự án cho An');
  });

  it('không bàn giao gì → chuỗi rỗng', () => {
    expect(handedOverText(result(0, 0), 'An')).toBe('');
  });
});
