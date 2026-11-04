import { normalizeText } from '@/lib/normalize-text';
import type { OrgChart, OrgDepartment, OrgPerson } from './types';

/** Mọi người trong một phòng: Trưởng phòng rồi thành viên. */
export const departmentPeople = (department: OrgDepartment): OrgPerson[] =>
  department.manager ? [department.manager, ...department.members] : department.members;

/** Tổng số người hiện trên sơ đồ. */
export const peopleCount = (chart: OrgChart): number =>
  chart.leaders.length +
  chart.unassigned.length +
  chart.departments.reduce((sum, department) => sum + departmentPeople(department).length, 0);

export interface OrgSearchResult {
  /** id người khớp, theo thứ tự xuất hiện trên sơ đồ (người đầu tiên được cuộn tới). */
  personIds: string[];
  /** Phòng có người khớp — mở nhánh dù đang thu gọn. */
  departmentIds: Set<string>;
}

/** Tìm theo tên hoặc chức danh, không phân biệt dấu ("ke toan" khớp "Kế toán"). Chuỗi rỗng → không khớp ai. */
export function searchOrgChart(chart: OrgChart, query: string): OrgSearchResult {
  const needle = normalizeText(query);
  const result: OrgSearchResult = { personIds: [], departmentIds: new Set() };
  if (!needle) return result;
  const matches = (person: OrgPerson) =>
    normalizeText(`${person.fullName} ${person.jobTitle ?? ''}`).includes(needle);
  result.personIds.push(...chart.leaders.filter(matches).map((person) => person.id));
  for (const department of chart.departments) {
    const found = departmentPeople(department).filter(matches);
    if (found.length === 0) continue;
    result.departmentIds.add(department.id);
    result.personIds.push(...found.map((person) => person.id));
  }
  result.personIds.push(...chart.unassigned.filter(matches).map((person) => person.id));
  return result;
}

/** id phần tử DOM của thẻ người — để cuộn tới khi tìm. */
export const orgPersonAnchor = (personId: string) => `org-person-${personId}`;
