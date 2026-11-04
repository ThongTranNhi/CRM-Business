import type { RequestScope } from '../../lib/request-scope';
import { getAvatarUrls } from '../users/users.service';
import * as orgChartRepository from './org-chart.repository';
import type { OrgChart, OrgEmployeeRecord, OrgPerson } from './org-chart.types';

// Sơ đồ tổ chức (frontend-spec 4.11): mọi role đều xem (như danh sách thành viên ở chi tiết phòng ban).
// DB chưa có "quản lý trực tiếp" nên cây là Ban lãnh đạo → Phòng ban (Trưởng phòng) → Thành viên.

/** Trưởng nhóm đứng trước, sau đó theo tên (tiếng Việt). */
const byLeadThenName = (a: OrgPerson, b: OrgPerson) =>
  Number(b.role === 'team_leader') - Number(a.role === 'team_leader') ||
  a.fullName.localeCompare(b.fullName, 'vi');

/** Ghép phòng ban + nhân viên thành cây. Hàm thuần — có test. */
export function buildOrgChart(
  departments: { id: string; name: string }[],
  employees: OrgEmployeeRecord[],
  avatarUrls: Map<string, string>,
): OrgChart {
  const toPerson = (employee: OrgEmployeeRecord): OrgPerson => ({
    id: employee.id,
    fullName: employee.fullName,
    jobTitle: employee.jobTitle,
    role: employee.role,
    avatarUrl: avatarUrls.get(employee.id) ?? null,
  });
  const isLeader = (employee: OrgEmployeeRecord) => employee.role === 'super_admin';
  const inDepartment = (departmentId: string) =>
    employees.filter((employee) => employee.departmentId === departmentId);
  const knownDepartments = new Set(departments.map((department) => department.id));

  return {
    leaders: employees.filter(isLeader).map(toPerson).sort(byLeadThenName),
    departments: departments.map((department) => {
      const people = inDepartment(department.id);
      const manager = people.find((employee) => employee.isDepartmentManager);
      return {
        id: department.id,
        name: department.name,
        manager: manager ? toPerson(manager) : null,
        members: people
          .filter((employee) => employee !== manager && !isLeader(employee))
          .map(toPerson)
          .sort(byLeadThenName),
      };
    }),
    // Phòng đã xoá hoặc không có phòng → chưa thuộc phòng nào.
    unassigned: employees
      .filter((employee) => !isLeader(employee))
      .filter((employee) => !employee.departmentId || !knownDepartments.has(employee.departmentId))
      .map(toPerson)
      .sort(byLeadThenName),
  };
}

export async function getOrgChart({ env }: RequestScope): Promise<OrgChart> {
  const [departments, employees] = await Promise.all([
    orgChartRepository.listDepartments(env),
    orgChartRepository.listEmployees(env),
  ]);
  return buildOrgChart(departments, employees, await getAvatarUrls(env, employees));
}
