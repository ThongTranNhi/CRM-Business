import { Link } from 'react-router-dom';
import { Table, type TableColumn } from '@/components/ui';
import { formatIsoDate } from '../project.utils';
import type { ProjectSummary } from '../types';
import { ProjectProgress } from './ProjectProgress';
import { ProjectStatusBadge } from './ProjectStatusBadge';

const COLUMNS: TableColumn<ProjectSummary>[] = [
  {
    key: 'name',
    header: 'Dự án',
    render: (project) => (
      <Link
        to={`/app/projects/${project.id}`}
        className="font-medium text-gray-900 hover:text-primary-700 hover:underline"
      >
        {project.name}
      </Link>
    ),
  },
  {
    key: 'department',
    header: 'Phòng ban',
    render: (project) => (
      <Link to={`/app/departments/${project.department.id}`} className="hover:underline">
        {project.department.name}
      </Link>
    ),
  },
  { key: 'owner', header: 'Chủ dự án', render: (project) => project.owner?.fullName ?? '—' },
  {
    key: 'status',
    header: 'Trạng thái',
    render: (project) => <ProjectStatusBadge project={project} />,
  },
  { key: 'due', header: 'Hạn', render: (project) => formatIsoDate(project.dueDate) },
  {
    key: 'progress',
    header: 'Tiến độ',
    render: (project) => <ProjectProgress progress={project.progress} />,
  },
  {
    key: 'tasks',
    header: 'Số việc',
    className: 'text-right',
    render: (project) => project.progress.total,
  },
];

export function ProjectTable({ projects }: { projects: ProjectSummary[] }) {
  return (
    <Table
      caption="Danh sách dự án"
      columns={COLUMNS}
      rows={projects}
      getRowKey={(project) => project.id}
    />
  );
}
