import { describe, expect, it } from 'vitest';
import { groupByDay, notificationLink, notificationText } from './notifications.utils';
import type { NotificationItem } from './types';

const item = (facts: Partial<NotificationItem> = {}): NotificationItem => ({
  id: 'n-1',
  type: 'task_assigned',
  createdAt: '2026-10-11T03:00:00Z',
  readAt: null,
  task: { id: 't-1', title: 'Gọi khách', dueDate: '2026-10-12', isArchived: false },
  dashboardId: 'd-1',
  actor: { fullName: 'Nguyễn An' },
  commentExcerpt: null,
  ...facts,
});

describe('notificationText', () => {
  it('ghép câu theo loại, người thao tác đứng đầu', () => {
    expect(notificationText(item())).toBe('Nguyễn An giao cho bạn việc “Gọi khách”');
    expect(notificationText(item({ type: 'task_collaborator_added' }))).toBe(
      'Nguyễn An thêm bạn làm người phối hợp việc “Gọi khách”',
    );
    expect(notificationText(item({ type: 'comment_mention' }))).toBe(
      'Nguyễn An nhắc đến bạn trong bình luận việc “Gọi khách”',
    );
  });

  it('thông báo hệ thống nêu hạn, không có người thao tác', () => {
    expect(notificationText(item({ type: 'task_due_soon', actor: null }))).toBe(
      'Việc “Gọi khách” đến hạn ngày mai (12/10)',
    );
    expect(notificationText(item({ type: 'task_overdue', actor: null }))).toBe(
      'Việc “Gọi khách” đã quá hạn (12/10)',
    );
  });
});

describe('notificationLink', () => {
  it('mở task trong board', () => {
    expect(notificationLink(item())).toBe('/app/workspace/d-1?task=t-1');
  });
});

describe('groupByDay', () => {
  it('nhóm theo ngày giờ Việt Nam, giữ thứ tự mới nhất trước', () => {
    const now = new Date('2026-10-11T05:00:00Z');
    const groups = groupByDay(
      [
        item({ id: 'a', createdAt: '2026-10-11T01:00:00Z' }),
        // 23:30 ngày 10/10 giờ Việt Nam.
        item({ id: 'b', createdAt: '2026-10-10T16:30:00Z' }),
        item({ id: 'c', createdAt: '2026-10-08T03:00:00Z' }),
      ],
      now,
    );
    expect(groups.map((group) => [group.label, group.items.map((x) => x.id)])).toEqual([
      ['Hôm nay', ['a']],
      ['Hôm qua', ['b']],
      ['08/10', ['c']],
    ]);
  });
});
