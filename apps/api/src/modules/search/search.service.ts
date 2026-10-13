import type { RequestScope } from '../../lib/request-scope';
import { listVisibleBoards } from '../department-dashboards/department-dashboards.service';
import { listDepartments } from '../departments/departments.service';
import { listProjects } from '../projects/projects.service';
import { searchTaskTitles } from '../tasks/tasks.service';
import { getEmployeeDirectory } from '../users/users.service';
import type {
  DepartmentResult,
  EmployeeResult,
  ProjectResult,
  SearchResults,
  TaskResult,
} from './search.types';

// Ô tìm kiếm ở Header: mỗi nhóm dùng lại service của module sở hữu nên cùng quy tắc quyền với trang danh
// sách tương ứng — không có đường đọc riêng (docs/api/endpoints/search.md).

const LIMIT = 5;
const FIRST_PAGE = { page: 1, pageSize: LIMIT };
const EMPTY: SearchResults = { tasks: [], employees: [], projects: [], departments: [] };

/** Task trên board người xem được thấy ở Workspace (BR-41, BR-06). */
async function searchTasks(scope: RequestScope, q: string): Promise<TaskResult[]> {
  const boards = await listVisibleBoards(scope);
  const byBoard = new Map(boards.map((board) => [board.boardId, board]));
  const matches = await searchTaskTitles(scope.env, [...byBoard.keys()], q, LIMIT);
  return matches.flatMap((task) => {
    const board = byBoard.get(task.boardId);
    if (!board) return [];
    const { dashboardId, dashboardName } = board;
    return [{ id: task.id, title: task.title, status: task.status, dashboardId, dashboardName }];
  });
}

/** Danh bạ nhân viên: chỉ Super Admin (quyền employees.view — permission-model.md). */
async function searchEmployees(scope: RequestScope, q: string): Promise<EmployeeResult[]> {
  if (scope.actor.role !== 'super_admin') return [];
  const page = await getEmployeeDirectory(scope.env, scope.actor.id, {
    ...FIRST_PAGE,
    status: 'active',
    q,
  });
  return page.data.map((employee) => ({
    id: employee.id,
    fullName: employee.fullName,
    jobTitle: employee.jobTitle,
    departmentName: employee.departmentName,
  }));
}

/** Dự án người xem được thấy (cùng quy tắc trang Dự án), chưa lưu trữ. */
async function searchProjects(scope: RequestScope, q: string): Promise<ProjectResult[]> {
  const page = await listProjects(scope, { ...FIRST_PAGE, q });
  return page.data.map((project) => ({
    id: project.id,
    name: project.name,
    departmentName: project.department.name,
  }));
}

/** Phòng ban chưa xoá (mọi người xem được). */
async function searchDepartments(scope: RequestScope, q: string): Promise<DepartmentResult[]> {
  const page = await listDepartments(scope, {
    ...FIRST_PAGE,
    status: 'active',
    q,
    withoutDashboard: false,
  });
  return page.data.map((department) => ({ id: department.id, name: department.name }));
}

export async function search(scope: RequestScope, q: string | undefined): Promise<SearchResults> {
  if (!q) return EMPTY;
  const [tasks, employees, projects, departments] = await Promise.all([
    searchTasks(scope, q),
    searchEmployees(scope, q),
    searchProjects(scope, q),
    searchDepartments(scope, q),
  ]);
  return { tasks, employees, projects, departments };
}
