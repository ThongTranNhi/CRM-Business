import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useInvalidateQueries } from '@/lib/use-invalidate-queries';
import { deleteEmployee, restoreEmployee, saveEmployee } from '../api/directory.api';
import type { AdminEmployeeUpdate } from '../types';

// Đổi hồ sơ / xoá nhân viên làm thay đổi cả số người và trưởng phòng của phòng ban.
const AFFECTED_KEYS = [
  ['employee-directory'],
  ['employee-detail'],
  ['employee-options'],
  ['departments'],
];

export function useSaveEmployee(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: (input: AdminEmployeeUpdate) => saveEmployee(id, input),
    onSuccess: invalidate,
  });
}

export function useDeleteEmployee(id: string) {
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  return useMutation({
    mutationFn: (newManagerId: string | null) => deleteEmployee(id, newManagerId),
    onSuccess: invalidate,
  });
}

/** Khôi phục kèm toast kết quả: dùng cho nút [Khôi phục] và [Hoàn tác] sau khi xoá (BR-53). */
export function useRestoreEmployee() {
  const toast = useToast();
  const invalidate = useInvalidateQueries(AFFECTED_KEYS);
  const mutation = useMutation({ mutationFn: restoreEmployee, onSuccess: invalidate });

  async function restore(employeeId: string) {
    try {
      await mutation.mutateAsync(employeeId);
      toast({ message: 'Đã khôi phục. Nhân viên cần đăng nhập lại.' });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return { restore, isPending: mutation.isPending };
}
