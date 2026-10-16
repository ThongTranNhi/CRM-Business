import type { RequestScope } from '../../lib/request-scope';
import { getCompanyTaskTotals } from '../department-dashboards/department-dashboards.service';
import { getMyTaskSummary } from '../tasks/tasks.service';
import type { PersonalOverview } from './overview.types';

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
