import type { SearchGroup, SearchResults } from './types';

/** Gõ ≥ 2 ký tự mới tìm (frontend-spec 3.2). */
export const MIN_QUERY = 2;

const joined = (...parts: (string | null)[]) => parts.filter(Boolean).join(' · ') || null;

/** Nhóm theo thứ tự Công việc / Nhân viên / Dự án / Phòng ban; bỏ nhóm rỗng. Task mở drawer `?task=`. */
export function toSearchGroups(results: SearchResults): SearchGroup[] {
  const groups: SearchGroup[] = [
    {
      label: 'Công việc',
      hits: results.tasks.map((task) => ({
        key: `task-${task.id}`,
        href: `/app/workspace/${task.dashboardId}?task=${task.id}`,
        title: task.title,
        detail: task.dashboardName,
      })),
    },
    {
      label: 'Nhân viên',
      hits: results.employees.map((employee) => ({
        key: `employee-${employee.id}`,
        href: `/app/employees/${employee.id}`,
        title: employee.fullName,
        detail: joined(employee.jobTitle, employee.departmentName),
      })),
    },
    {
      label: 'Dự án',
      hits: results.projects.map((project) => ({
        key: `project-${project.id}`,
        href: `/app/projects/${project.id}`,
        title: project.name,
        detail: project.departmentName,
      })),
    },
    {
      label: 'Phòng ban',
      hits: results.departments.map((department) => ({
        key: `department-${department.id}`,
        href: `/app/departments/${department.id}`,
        title: department.name,
        detail: null,
      })),
    },
  ];
  return groups.filter((group) => group.hits.length > 0);
}

/** Phím `/` mở ô tìm kiếm, trừ khi đang gõ trong ô nhập khác. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}
