import { Link } from 'react-router-dom';
import { useCan } from '@/features/auth';

interface EmployeeNameProps {
  id: string;
  name: string;
}

/** Tên nhân viên bấm được tới hồ sơ nếu người xem có quyền; không có quyền thì chỉ hiện tên. */
export function EmployeeName({ id, name }: EmployeeNameProps) {
  const canDo = useCan();
  if (!canDo('employees.view')) return <span title={name}>{name}</span>;
  return (
    <Link to={`/app/employees/${id}`} className="font-medium text-primary-700 hover:underline">
      {name}
    </Link>
  );
}
