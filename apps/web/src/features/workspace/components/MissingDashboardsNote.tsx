import { Link } from 'react-router-dom';
import { useCan } from '@/features/auth';
import { useDepartmentsWithoutDashboard } from '@/features/departments';

interface MissingDashboardsNoteProps {
  onCreate: (departmentId: string) => void;
}

/** Dòng dưới lưới: phòng ban chưa có Dashboard (workspace.md). Ẩn khi mọi phòng đã có. */
export function MissingDashboardsNote({ onCreate }: MissingDashboardsNoteProps) {
  const { data } = useDepartmentsWithoutDashboard();
  const canDo = useCan();
  if (!data || data.length === 0) return null;
  return (
    <p className="mt-6 text-sm text-gray-500">
      Phòng ban chưa có Dashboard:{' '}
      {data.map((department, index) => (
        <span key={department.id}>
          {index > 0 && ' · '}
          <Link
            to={`/app/departments/${department.id}`}
            className="font-medium text-gray-700 hover:text-primary-700 hover:underline"
          >
            {department.name}
          </Link>
          {canDo('dashboards.create', { departmentId: department.id }) && (
            <>
              {' ('}
              <button
                type="button"
                onClick={() => onCreate(department.id)}
                className="font-medium text-primary-700 hover:underline"
              >
                Tạo
              </button>
              {')'}
            </>
          )}
        </span>
      ))}
    </p>
  );
}
