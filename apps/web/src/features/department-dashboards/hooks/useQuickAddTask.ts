import { useToast } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useCreateTask } from '@/features/tasks';
import { errorMessage } from '@/lib/api-client';
import type { DashboardDetail } from '../types';
import { BOARD_RELATED_KEYS } from './board-related-keys';

/**
 * Ô "+ Thêm công việc" trong cột: người phụ trách mặc định là mình nếu mình thuộc board; nếu không
 * (vd. Super Admin ngoài phòng) mở modal đầy đủ với tên đã nhập để chọn người phụ trách.
 */
export function useQuickAddTask(dashboard: DashboardDetail, openForm: (title: string) => void) {
  const toast = useToast();
  const { data: user } = useCurrentUser();
  const create = useCreateTask(dashboard.boardId, BOARD_RELATED_KEYS);
  const myEmployeeId = user?.employeeId ?? null;
  const isMember = dashboard.members.some((member) => member.id === myEmployeeId);

  /** true: đã tạo (hoặc chuyển sang modal đầy đủ) → đóng ô; false: lỗi, giữ chữ đã gõ. */
  async function submit(title: string): Promise<boolean> {
    if (!myEmployeeId || !isMember) {
      openForm(title);
      return true;
    }
    try {
      await create.mutateAsync({
        title,
        assigneeId: myEmployeeId,
        collaboratorIds: [],
        priority: 'normal',
        startDate: null,
        dueDate: null,
        description: null,
        projectId: null,
      });
      toast({ message: 'Đã tạo công việc' });
      return true;
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
      return false;
    }
  }

  return { onSubmit: submit, isPending: create.isPending };
}
