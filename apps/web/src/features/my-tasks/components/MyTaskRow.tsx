import { Link } from 'react-router-dom';
import { Badge, Icon } from '@/components/ui';
import { dueBadge, PRIORITY_META } from '@/features/tasks';
import { cn } from '@/lib/cn';
import { canComplete, taskLink } from '../my-tasks.utils';
import type { MyTask } from '../types';

interface MyTaskRowProps {
  task: MyTask;
  /** YYYY-MM-DD theo giờ Việt Nam (màu hạn như thẻ trên board). */
  today: string;
  onComplete: (task: MyTask & { doneColumnId: string }) => void;
}

/** Một dòng Việc của tôi: checkbox hoàn thành nhanh + vùng bấm mở drawer task trên board. */
export function MyTaskRow({ task, today, onComplete }: MyTaskRowProps) {
  const isDone = task.status === 'done';
  const due = dueBadge(task, today);
  const priority = PRIORITY_META[task.priority];
  return (
    <li className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
      <span className="flex h-6 w-5 shrink-0 items-center justify-center">
        {canComplete(task) ? (
          <input
            type="checkbox"
            aria-label={`Hoàn thành: ${task.title}`}
            className="h-4 w-4 rounded border-gray-300 text-primary-500 focus:ring-primary-300"
            onChange={() => onComplete(task)}
          />
        ) : (
          isDone && <Icon name="check" size={16} className="text-success-600" />
        )}
      </span>
      <Link to={taskLink(task)} className="min-w-0 flex-1 focus-visible:outline-none">
        <p
          className={cn(
            'font-medium text-gray-900 hover:text-primary-700',
            isDone && 'text-gray-500 line-through',
          )}
        >
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
          <span>{task.dashboard.name}</span>
          {task.project && (
            <span className="inline-flex items-center gap-1">
              <Icon name="folder" size={12} />
              {task.project.name}
            </span>
          )}
          <Badge tone={priority.tone}>{priority.label}</Badge>
          {due && <Badge tone={due.tone}>{due.label}</Badge>}
          {task.checklist.total > 0 && (
            <span className="inline-flex items-center gap-1">
              <Icon name="checkSquare" size={12} />
              {task.checklist.done}/{task.checklist.total}
            </span>
          )}
          {task.role === 'collaborator' && <Badge tone="info">Phối hợp</Badge>}
        </div>
      </Link>
    </li>
  );
}
