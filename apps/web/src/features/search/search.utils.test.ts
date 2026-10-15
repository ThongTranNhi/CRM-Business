import { describe, expect, it } from 'vitest';
import { toSearchGroups } from './search.utils';

const empty = { tasks: [], employees: [], projects: [], departments: [] };

describe('toSearchGroups', () => {
  it('nhóm theo thứ tự, bỏ nhóm rỗng, đường dẫn đúng trang', () => {
    const groups = toSearchGroups({
      ...empty,
      departments: [{ id: 'dep-1', name: 'Kinh doanh' }],
      tasks: [
        { id: 't-1', title: 'Gọi khách', status: 'todo', dashboardId: 'd-1', dashboardName: 'KD' },
      ],
    });
    expect(groups.map((group) => group.label)).toEqual(['Công việc', 'Phòng ban']);
    expect(groups[0]?.hits[0]).toEqual({
      key: 'task-t-1',
      href: '/app/workspace/d-1?task=t-1',
      title: 'Gọi khách',
      detail: 'KD',
    });
    expect(groups[1]?.hits[0]?.href).toBe('/app/departments/dep-1');
  });

  it('nhân viên: chức vụ · phòng, bỏ phần trống', () => {
    const [group] = toSearchGroups({
      ...empty,
      employees: [{ id: 'e-1', fullName: 'An', jobTitle: null, departmentName: 'Kinh doanh' }],
    });
    expect(group?.hits[0]?.detail).toBe('Kinh doanh');
  });

  it('không có kết quả → không có nhóm', () => {
    expect(toSearchGroups(empty)).toEqual([]);
  });
});
