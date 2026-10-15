import { toPage } from '../../lib/pagination';
import type { RequestScope } from '../../lib/request-scope';
import { taskPermissions } from '../../lib/work-access';
import { getEmployeeSummary } from '../auth/auth.service';
import * as mineRepository from './tasks.mine.repository';
import type { MyTaskRow } from './tasks.mine.repository';
import type { MyTask, MyTaskCounts, MyTasksQuery } from './tasks.types';

// Việc của tôi (Đợt 3 S2): chỉ việc của CHÍNH người gọi — employee_id lấy từ phiên đăng nhập, không nhận từ
// query. View my_task_rows đã bỏ task lưu trữ, phòng đã xoá, board người đó không còn xem được.

const EMPTY_COUNTS: MyTaskCounts = { today: 0, week: 0, overdue: 0, open: 0, done: 0 };

/** Quyền sửa theo đúng luật board (lib/work-access.ts); phòng đã xoá không vào view nên không chỉ đọc. */
function toMyTask(row: MyTaskRow, role: RequestScope['actor']['role']): MyTask {
  const { canEdit } = taskPermissions(
    {
      role,
      isReadOnly: false,
      isDepartmentMember: row.is_department_member,
      isDepartmentManager: row.is_department_manager,
      isBoardMember: row.is_board_member,
    },
    { isAssignee: row.is_assignee, isCollaborator: !row.is_assignee, isCreator: false },
  );
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    completedAt: row.completed_at,
    role: row.is_assignee ? 'assignee' : 'collaborator',
    department: { id: row.department_id, name: row.department_name },
    dashboard: { id: row.dashboard_id, name: row.dashboard_name },
    project:
      row.project_id && row.project_name ? { id: row.project_id, name: row.project_name } : null,
    checklist: { done: row.checklist_done, total: row.checklist_total },
    columnId: row.column_id,
    doneColumnId: row.done_column_id,
    canEdit,
  };
}

/** Danh sách một tab (phân trang) + số việc mọi tab — `{ data, meta: { page, pageSize, total, counts } }`. */
export async function listMyTasks(scope: RequestScope, query: MyTasksQuery) {
  const employee = await getEmployeeSummary(scope.env, scope.actor.id);
  const pagination = { page: query.page, pageSize: query.pageSize };
  if (!employee?.employeeId) {
    const page = toPage<MyTask>([], 0, pagination);
    return { ...page, meta: { ...page.meta, counts: EMPTY_COUNTS } };
  }
  const [{ rows, total }, counts] = await Promise.all([
    mineRepository.listMyTasks(scope.env, employee.employeeId, query),
    mineRepository.countMyTasks(scope.env, employee.employeeId, query),
  ]);
  const page = toPage(
    rows.map((row) => toMyTask(row, scope.actor.role)),
    total,
    pagination,
  );
  return { ...page, meta: { ...page.meta, counts } };
}
