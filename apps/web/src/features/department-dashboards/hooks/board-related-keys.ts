import { myTaskKeys } from '@/features/my-tasks/badge';
import { projectKeys } from '@/features/projects/project-options';
import { dashboardKeys } from './dashboard-keys';

/**
 * Query cần làm mới sau mọi thao tác ghi trên board (tạo / sửa / kéo / xoá / khôi phục task): số liệu thẻ
 * Workspace, Việc của tôi + badge quá hạn, tiến độ dự án.
 */
export const BOARD_RELATED_KEYS = [dashboardKeys.all, myTaskKeys.all, projectKeys.all] as const;
