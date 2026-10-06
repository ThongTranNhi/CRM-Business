import { Button, Icon } from '@/components/ui';
import { useRestoreEmployee } from '../hooks/useEmployeeMutations';

interface RestoreEmployeeButtonProps {
  employeeId: string;
}

/** Tài khoản về trạng thái trước khi xoá; không gán lại chức trưởng phòng (BR-53). */
export function RestoreEmployeeButton({ employeeId }: RestoreEmployeeButtonProps) {
  const { restore, isPending } = useRestoreEmployee();
  return (
    <Button loading={isPending} onClick={() => void restore(employeeId)}>
      <Icon name="restore" size={18} />
      Khôi phục
    </Button>
  );
}
