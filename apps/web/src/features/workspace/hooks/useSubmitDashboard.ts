import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/ui';
import { useCreateDashboard, type DashboardLinkState } from '@/features/department-dashboards';
import { errorMessage, hasErrorCode } from '@/lib/api-client';
import type {
  CreateDashboardErrors,
  CreateDashboardForm,
} from '../schemas/create-dashboard.schema';
import { existingDashboardId } from '../workspace.utils';

/**
 * Gửi form Tạo Dashboard. Thành công → mở board + toast. 409 (BR-04) → mở Dashboard có sẵn.
 * `replace`: nút Back không mở lại modal (?createFor=). Trả lỗi theo ô; lỗi khác hiện bằng toast.
 */
export function useSubmitDashboard() {
  const create = useCreateDashboard();
  const navigate = useNavigate();
  const toast = useToast();

  async function submit(form: CreateDashboardForm): Promise<CreateDashboardErrors> {
    try {
      const dashboard = await create.mutateAsync({
        departmentId: form.departmentId,
        name: form.name || undefined,
        description: form.description || undefined,
      });
      toast({ message: `Đã tạo Dashboard ${dashboard.name}` });
      const state: DashboardLinkState = { boardId: dashboard.boardId };
      navigate(`/app/workspace/${dashboard.id}`, { state, replace: true });
      return {};
    } catch (error) {
      const existingId = existingDashboardId(error);
      if (existingId) {
        toast({ message: 'Phòng này đã có Dashboard, đã mở Dashboard hiện có' });
        navigate(`/app/workspace/${existingId}`, { replace: true });
        return {};
      }
      if (hasErrorCode(error, 'DEPARTMENT_NOT_FOUND')) return { departmentId: errorMessage(error) };
      toast({ tone: 'error', message: errorMessage(error) });
      return {};
    }
  }

  return { submit, isPending: create.isPending };
}
