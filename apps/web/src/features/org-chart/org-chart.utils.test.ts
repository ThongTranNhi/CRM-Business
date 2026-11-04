import { describe, expect, it } from 'vitest';
import { peopleCount, searchOrgChart } from './org-chart.utils';
import type { OrgChart, OrgPerson } from './types';

const person = (id: string, fullName: string, jobTitle: string | null = null): OrgPerson => ({
  id,
  fullName,
  jobTitle,
  role: 'employee',
  avatarUrl: null,
});

const chart: OrgChart = {
  leaders: [person('ceo', 'Trần Hoàng Thông', 'Giám đốc')],
  departments: [
    {
      id: 'ke-toan',
      name: 'Kế toán',
      manager: person('lan', 'Nguyễn Thị Lan', 'Kế toán trưởng'),
      members: [person('an', 'Lê An')],
    },
    { id: 'phap-che', name: 'Pháp chế', manager: null, members: [] },
  ],
  unassigned: [person('moi', 'Phạm Mới')],
};

describe('org chart search', () => {
  it('matches name or job title without accents, in chart order', () => {
    const result = searchOrgChart(chart, 'ke toan');
    expect(result.personIds).toEqual(['lan']);
    expect([...result.departmentIds]).toEqual(['ke-toan']);
    // "Trần" cũng chứa "an": người khớp theo thứ tự trên sơ đồ — lãnh đạo, phòng ban, chưa có phòng.
    expect(searchOrgChart(chart, 'AN').personIds).toEqual(['ceo', 'lan', 'an']);
  });

  it('returns nothing for an empty query', () => {
    const result = searchOrgChart(chart, '  ');
    expect(result.personIds).toEqual([]);
    expect(result.departmentIds.size).toBe(0);
  });

  it('counts everyone shown on the chart', () => {
    expect(peopleCount(chart)).toBe(4);
  });
});
