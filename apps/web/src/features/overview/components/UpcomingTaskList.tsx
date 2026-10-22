import { Link } from 'react-router-dom';
import { Badge, EmptyState } from '@/components/ui';
import { dueLabel } from '../executive.utils';
import type { UpcomingTask } from '../types';

interface UpcomingTaskListProps {
  tasks: UpcomingTask[];
}

/** "Hạn chót 7 ngày tới" (tối đa 8): bấm → task trên board của phòng. */
export function UpcomingTaskList({ tasks }: UpcomingTaskListProps) {
  if (tasks.length === 0) {
    return <EmptyState icon="calendar" title="Không có việc đến hạn trong 7 ngày tới" />;
  }
  return (
    <ul className="divide-y divide-gray-100">
      {tasks.map((task) => (
        <li key={task.id}>
          <Link
            to={`/app/workspace/${task.dashboardId}?task=${task.id}`}
            className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-gray-50"
          >
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium text-gray-900">{task.title}</span>
              <span className="block truncate text-xs text-gray-500">
                {task.department.name} · {task.assignee.fullName}
              </span>
            </span>
            <Badge tone={task.daysLeft <= 1 ? 'warning' : 'neutral'}>
              {dueLabel(task.daysLeft)}
            </Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
