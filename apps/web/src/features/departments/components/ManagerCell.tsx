import { Badge } from '@/components/ui';
import { EmployeeName } from '@/features/employees';
import type { PersonRef } from '../types';

interface ManagerCellProps {
  manager: PersonRef | null;
}

/** Tên trưởng phòng, hoặc nhãn cảnh báo khi phòng chưa có trưởng phòng (BR-08). */
export function ManagerCell({ manager }: ManagerCellProps) {
  if (!manager) return <Badge tone="warning">Chưa có trưởng phòng</Badge>;
  return <EmployeeName id={manager.id} name={manager.fullName} />;
}
