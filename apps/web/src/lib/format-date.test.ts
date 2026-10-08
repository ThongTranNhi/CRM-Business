import { describe, expect, it } from 'vitest';
import {
  addDays,
  formatDateTime,
  formatDayMonth,
  formatRelativeTime,
  startOfWeek,
  todayInVietnam,
} from './format-date';

describe('Vietnam calendar dates', () => {
  it('uses the Asia/Ho_Chi_Minh day, not the UTC day', () => {
    // 18:30 UTC ngày 06/10 = 01:30 sáng 07/10 ở Việt Nam.
    expect(todayInVietnam(new Date('2026-10-06T18:30:00Z'))).toBe('2026-10-07');
  });
  it('adds days across month boundaries', () => {
    expect(addDays('2026-10-30', 3)).toBe('2026-11-02');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
  it('starts the week on Monday', () => {
    expect(startOfWeek('2026-10-07')).toBe('2026-10-05'); // Thứ Tư → Thứ Hai
    expect(startOfWeek('2026-10-11')).toBe('2026-10-05'); // Chủ Nhật → Thứ Hai trước đó
  });
  it('formats dd/MM', () => {
    expect(formatDayMonth('2026-10-09')).toBe('09/10');
  });
  it('formats time and date in Vietnam time', () => {
    expect(formatDateTime(new Date('2026-10-06T18:30:00Z'))).toBe('01:30 07/10/2026');
  });
});

describe('relative time for comments', () => {
  const now = new Date('2026-10-08T10:00:00Z');
  const ago = (ms: number) => formatRelativeTime(new Date(now.getTime() - ms), now);
  it('reads naturally in Vietnamese', () => {
    expect(ago(20_000)).toBe('vừa xong');
    expect(ago(5 * 60_000)).toBe('5 phút trước');
    expect(ago(3 * 3_600_000)).toBe('3 giờ trước');
    expect(ago(30 * 3_600_000)).toBe('hôm qua');
    expect(ago(4 * 86_400_000)).toBe('4 ngày trước');
  });
  it('falls back to the date after a week', () => {
    expect(ago(10 * 86_400_000)).toBe('28/09/2026');
  });
});
