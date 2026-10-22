import { Link } from 'react-router-dom';
import { EmptyState, ProgressBar } from '@/components/ui';
import { formatDayMonth } from '@/lib/format-date';
import type { ProjectProgressItem } from '../types';

interface ProjectProgressListProps {
  projects: ProjectProgressItem[];
}

/** "Tiến độ dự án" (tối đa 8 dự án chưa xong, hạn gần nhất trước): bấm → trang dự án. */
export function ProjectProgressList({ projects }: ProjectProgressListProps) {
  if (projects.length === 0) return <EmptyState icon="folder" title="Không có dự án đang chạy" />;
  return (
    <ul className="divide-y divide-gray-100">
      {projects.map((project) => (
        <li key={project.id}>
          <Link to={`/app/projects/${project.id}`} className="block px-4 py-3 hover:bg-gray-50">
            <div className="flex items-baseline justify-between gap-3">
              <span className="truncate text-sm font-medium text-gray-900">{project.name}</span>
              <span className="shrink-0 text-xs tabular-nums text-gray-500">
                {project.progress.done}/{project.progress.total} việc
                {project.progress.percent !== null && ` · ${project.progress.percent}%`}
              </span>
            </div>
            <ProgressBar
              value={project.progress.percent ?? 0}
              label={`Tiến độ ${project.name}`}
              className="my-2"
            />
            <p className="text-xs text-gray-500">
              {project.department.name}
              {project.dueDate && ` · Hạn ${formatDayMonth(project.dueDate)}`}
              {project.progress.overdue > 0 && (
                <span className="text-danger-700"> · {project.progress.overdue} việc quá hạn</span>
              )}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}
