import { useCurrentUser } from '@/features/auth';
import { useCreatableDepartments } from './useCreatableDepartments';

/**
 * Hiện [+ Tạo Dashboard]: Super Admin luôn hiện (tạo được phòng ban mới ngay trong modal); Trưởng phòng
 * chỉ khi phòng mình quản lý chưa có Dashboard (BR-05).
 */
export function useCanCreateDashboard(): boolean {
  const { data: user } = useCurrentUser();
  const { options } = useCreatableDepartments(null);
  if (user?.role === 'super_admin') return true;
  return options.length > 0;
}
