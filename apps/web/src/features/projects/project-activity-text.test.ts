import { describe, expect, it } from 'vitest';
import { projectActivityText } from './project-activity-text';
import type { ProjectActivity } from './types';

const activity = (
  action: string,
  from: ProjectActivity['from'],
  to: ProjectActivity['to'],
): ProjectActivity => ({
  id: 'x',
  action,
  createdAt: '2026-10-09T03:00:00Z',
  actor: { id: 'a-1', fullName: 'Nguyễn Văn An' },
  from,
  to,
});

describe('project activity sentences', () => {
  it('lists every changed field of an update', () => {
    const text = projectActivityText(
      activity(
        'project.update',
        { name: 'Web', status: 'planning', dueDate: null, owner: null },
        {
          name: 'Web mới',
          status: 'active',
          dueDate: '2026-10-30',
          owner: { id: 'e-1', fullName: 'Lan' },
        },
      ),
    );
    expect(text).toBe(
      'Nguyễn Văn An đổi tên: “Web” → “Web mới”; đổi trạng thái: Lên kế hoạch → Đang chạy; ' +
        'đổi chủ dự án: chưa có → Lan; đổi hạn: không có → 30/10/2026',
    );
  });
  it('tells added and removed members apart', () => {
    const lan = { id: 'e-1', fullName: 'Lan' };
    const binh = { id: 'e-2', fullName: 'Bình' };
    const text = projectActivityText(
      activity('project.members', { members: [lan] }, { members: [binh] }),
    );
    expect(text).toBe('Nguyễn Văn An thêm thành viên Bình; bỏ thành viên Lan');
  });
  it('describes tasks joining and leaving the project', () => {
    const task = { id: 't-1', title: 'Viết bài' };
    expect(projectActivityText(activity('project.task_added', null, { task }))).toBe(
      'Nguyễn Văn An thêm công việc “Viết bài” vào dự án',
    );
    expect(projectActivityText(activity('project.task_removed', { task }, null))).toBe(
      'Nguyễn Văn An bỏ công việc “Viết bài” khỏi dự án',
    );
  });
  it('falls back for unknown actions and missing actor', () => {
    const unknown = { ...activity('project.something', null, null), actor: null };
    expect(projectActivityText(unknown)).toBe('Ai đó cập nhật dự án');
  });
});
