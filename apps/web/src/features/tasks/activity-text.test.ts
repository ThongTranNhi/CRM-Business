import { describe, expect, it } from 'vitest';
import { activityText } from './activity-text';
import type { TaskActivity } from './types';

const actor = { id: 'a-1', fullName: 'Nguyễn Văn An' };
const activity = (action: string, from: TaskActivity['from'], to: TaskActivity['to']) => ({
  id: 'x',
  action,
  createdAt: '2026-10-08T03:00:00Z',
  actor,
  from,
  to,
});

describe('activity sentences (activity-log.md)', () => {
  it('describes column moves with sentence-case names', () => {
    const moved = activity(
      'moved',
      { columnName: 'VIỆC CẦN LÀM' },
      { columnName: 'VIỆC ĐANG LÀM' },
    );
    expect(activityText(moved)).toBe('Nguyễn Văn An chuyển: Việc cần làm → Việc đang làm');
  });
  it('covers completion, delete and restore', () => {
    expect(activityText(activity('completed', null, null))).toBe(
      'Nguyễn Văn An đánh dấu hoàn thành',
    );
    expect(activityText(activity('archived', null, null))).toBe('Nguyễn Văn An đã xoá công việc');
    expect(activityText(activity('restored', null, null))).toBe(
      'Nguyễn Văn An đã khôi phục công việc',
    );
  });
  it('names assignees, due dates and priorities', () => {
    const lan = { id: 'e-2', fullName: 'Trần Thị Lan' };
    expect(activityText(activity('assigned', null, { assignee: lan }))).toBe(
      'Nguyễn Văn An giao cho Trần Thị Lan',
    );
    expect(
      activityText(activity('due_date_changed', { dueDate: null }, { dueDate: '2026-10-09' })),
    ).toBe('Nguyễn Văn An đổi hạn: không có hạn → 09/10/2026');
    expect(
      activityText(activity('priority_changed', { priority: 'normal' }, { priority: 'urgent' })),
    ).toBe('Nguyễn Văn An đổi ưu tiên: Bình thường → Khẩn cấp');
  });
  it('tells added and removed collaborators apart', () => {
    const lan = { id: 'e-2', fullName: 'Trần Thị Lan' };
    const binh = { id: 'e-3', fullName: 'Lê Bình' };
    const changed = activity(
      'collaborators_changed',
      { collaborators: [lan] },
      { collaborators: [binh] },
    );
    expect(activityText(changed)).toBe(
      'Nguyễn Văn An thêm người phối hợp Lê Bình; bỏ người phối hợp Trần Thị Lan',
    );
  });
  it('describes moving a task into and out of a project', () => {
    const web = { id: 'p-1', name: 'Ra mắt web' };
    expect(activityText(activity('project_changed', null, { project: web }))).toBe(
      'Nguyễn Văn An chuyển vào dự án “Ra mắt web”',
    );
    expect(activityText(activity('project_changed', { project: web }, null))).toBe(
      'Nguyễn Văn An bỏ khỏi dự án “Ra mắt web”',
    );
  });
  it('describes checklist ticks and unknown actions safely', () => {
    const ticked = activity(
      'checklist_changed',
      { checklistItem: { content: 'Gửi báo giá', isDone: false } },
      { checklistItem: { content: 'Gửi báo giá', isDone: true } },
    );
    expect(activityText(ticked)).toBe('Nguyễn Văn An đánh dấu xong “Gửi báo giá”');
    expect(activityText({ ...activity('something_new', null, null), actor: null })).toBe(
      'Ai đó cập nhật công việc',
    );
  });
});
