import { Link } from 'react-router-dom';
import { Select } from '@/components/ui';
import type { TaskUpdater } from '../hooks/useTaskEdits';
import type { ProjectRef, TaskDetail } from '../types';
import { ReadOnlyField } from './ReadOnlyField';

interface TaskProjectFieldProps {
  task: TaskDetail;
  /** Dự án chưa lưu trữ của phòng (BR-30). */
  projects: ProjectRef[];
  update: TaskUpdater;
}

/** Ô "Dự án" trong drawer: chỉ dự án cùng phòng; bỏ chọn = bỏ khỏi dự án. Chỉ đọc → link tới dự án. */
export function TaskProjectField({ task, projects, update }: TaskProjectFieldProps) {
  if (!task.permissions.canEdit) {
    return (
      <ReadOnlyField label="Dự án">
        {task.project ? (
          <Link
            to={`/app/projects/${task.project.id}`}
            className="font-medium text-primary-700 hover:underline"
          >
            {task.project.name}
          </Link>
        ) : (
          'Không gắn dự án'
        )}
      </ReadOnlyField>
    );
  }
  // Dự án hiện tại đã lưu trữ vẫn hiện để không mất giá trị đang chọn.
  const current = task.project;
  const options =
    current && !projects.some((project) => project.id === current.id)
      ? [...projects, current]
      : projects;

  function change(projectId: string) {
    const project = options.find((candidate) => candidate.id === projectId) ?? null;
    if ((project?.id ?? null) === (current?.id ?? null)) return;
    update.mutate({ changes: { projectId: project?.id ?? null }, preview: { project } });
  }

  return (
    <Select
      label="Dự án"
      placeholder="Không gắn dự án"
      options={options.map((project) => ({ value: project.id, label: project.name }))}
      value={current?.id ?? ''}
      onChange={(event) => change(event.target.value)}
    />
  );
}
