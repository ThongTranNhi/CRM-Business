import type { Role } from '../../config/constants';
import { assertRole, type RequestScope } from '../../lib/request-scope';
import { getEmployeeSummary } from '../auth/auth.service';
import { getCompanyTaskTotals } from '../department-dashboards/department-dashboards.service';
import { listUnfinishedProjects } from '../projects/projects.service';
import { getMyTaskSummary } from '../tasks/tasks.service';
import { listOverloadedEmployees } from '../workload/workload.service';
import * as overviewRepository from './overview.repository';
import type { ExecutiveQuery } from './overview.schema';
import type {
  DepartmentTaskStats,
  ExecutiveOverview,
  PersonalOverview,
  TaskStatusCounts,
} from './overview.types';

// Tổng quan cá nhân (Đợt 4 S2, frontend-spec 4.2). Không có bảng riêng: ghép service của tasks (việc của chính người
// gọi) và department-dashboards (tổng toàn công ty, chỉ Super Admin). Khối Chấm công / Nghỉ phép / Phê duyệt thêm ở
// Đợt 5; thông báo giao diện đọc từ /api/notifications.

export async function getPersonalOverview(scope: RequestScope): Promise<PersonalOverview> {
  const isSuperAdmin = scope.actor.role === 'super_admin';
  const [tasks, company] = await Promise.all([
    getMyTaskSummary(scope),
    isSuperAdmin ? getCompanyTaskTotals(scope) : null,
  ]);
  return { ...tasks, company };
}

// Tổng quan điều hành (frontend-spec 4.7, chốt 22/10/2026): Super Admin mọi phòng; Trưởng phòng chỉ phòng mình (phòng
// lấy từ phiên đăng nhập như Khối lượng việc). Số đếm và biểu đồ phòng ban chỉ tính việc TẠO trong kỳ; dự án, hạn
// chót và nhân viên quá tải là tình trạng hiện tại. Khối Nhân sự hôm nay thêm ở Đợt 5.

export const EXECUTIVE_ROLES: readonly Role[] = ['super_admin', 'department_manager'];
const PROJECT_LIMIT = 8;
const UPCOMING_DAYS = 7;
const UPCOMING_LIMIT = 8;
const OVERLOADED_LIMIT = 5;

/** Cộng số đếm các phòng; `total` = cần làm + đang làm + hoàn thành (quá hạn nằm trong hai nhóm đầu). */
export function sumTaskStats(departments: DepartmentTaskStats[]) {
  const totals = departments.reduce<TaskStatusCounts>(
    (sum, row) => ({
      todo: sum.todo + row.todo,
      inProgress: sum.inProgress + row.inProgress,
      done: sum.done + row.done,
      overdue: sum.overdue + row.overdue,
    }),
    { todo: 0, inProgress: 0, done: 0, overdue: 0 },
  );
  return { ...totals, total: totals.todo + totals.inProgress + totals.done };
}

/** Super Admin → null (mọi phòng); Trưởng phòng → phòng của họ; `undefined` khi chưa thuộc phòng nào. */
async function departmentScope({ env, actor }: RequestScope) {
  if (actor.role === 'super_admin') return null;
  const employee = await getEmployeeSummary(env, actor.id);
  return employee?.departmentId ?? undefined;
}

export async function getExecutiveOverview(
  scope: RequestScope,
  { period }: ExecutiveQuery,
): Promise<ExecutiveOverview> {
  assertRole(scope.actor, EXECUTIVE_ROLES);
  const departmentId = await departmentScope(scope);
  if (departmentId === undefined) {
    return {
      period,
      departmentId: null,
      totals: sumTaskStats([]),
      departments: [],
      projects: [],
      upcoming: [],
      overloaded: [],
    };
  }
  const { env } = scope;
  const [departments, projects, upcoming, overloaded] = await Promise.all([
    overviewRepository.listDepartmentStats(env, period, departmentId),
    listUnfinishedProjects(env, departmentId, PROJECT_LIMIT),
    overviewRepository.listUpcoming(env, departmentId, UPCOMING_DAYS, UPCOMING_LIMIT),
    listOverloadedEmployees(env, departmentId, OVERLOADED_LIMIT),
  ]);
  return {
    period,
    departmentId,
    totals: sumTaskStats(departments),
    departments,
    projects,
    upcoming,
    overloaded,
  };
}
