import { useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { ApiError } from '@/lib/api-client';
import { readOption, useUrlParams } from '@/lib/use-url-params';
import { ProjectActions } from '../components/ProjectActions';
import { ProjectActivityTab } from '../components/ProjectActivityTab';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { ProjectMembersTab } from '../components/ProjectMembersTab';
import { ProjectOverviewTab } from '../components/ProjectOverviewTab';
import { ProjectSummaryBar } from '../components/ProjectSummaryBar';
import { ProjectTasksTab } from '../components/ProjectTasksTab';
import { useProject } from '../hooks/useProjects';
import type { ProjectDetail } from '../types';

const TABS = [
  { value: 'overview' as const, label: 'Tổng quan' },
  { value: 'tasks' as const, label: 'Công việc' },
  { value: 'members' as const, label: 'Thành viên' },
  { value: 'activity' as const, label: 'Hoạt động' },
];
const TAB_VALUES = TABS.map((tab) => tab.value);

/** /app/projects/:id — header + tab Tổng quan · Công việc · Thành viên · Hoạt động (`?tab=`). */
export function ProjectDetailPage() {
  const { id = '' } = useParams();
  const { data, isPending, isError, error, refetch } = useProject(id);

  if (isPending) return <Skeleton className="h-72 w-full" />;
  if (isError && error instanceof ApiError && error.status === 403) {
    return <Navigate to="/app/403" replace />;
  }
  if (isError && error instanceof ApiError && error.status < 500) {
    return (
      <>
        <PageHeader title="Không tìm thấy dự án" />
        <Card>
          <EmptyState
            icon="folder"
            title="Dự án không tồn tại hoặc đường dẫn đã sai"
            action={<ButtonLink to="/app/projects">Về danh sách dự án</ButtonLink>}
          />
        </Card>
      </>
    );
  }
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  return <ProjectDetailView project={data} />;
}

function ProjectDetailView({ project }: { project: ProjectDetail }) {
  const [params, updateParams] = useUrlParams();
  const [editing, setEditing] = useState(false);
  const tab = readOption(params, 'tab', TAB_VALUES);

  return (
    <>
      <PageHeader
        title={project.name}
        breadcrumbs={[{ label: 'Dự án', to: '/app/projects' }]}
        actions={<ProjectActions project={project} onEdit={() => setEditing(true)} />}
      />
      <ProjectSummaryBar project={project} />
      <div className="mb-4 mt-6">
        <Tabs
          label="Mục của dự án"
          items={TABS}
          value={tab}
          onChange={(next) => updateParams({ tab: next === 'overview' ? null : next })}
        />
      </div>
      {tab === 'overview' && <ProjectOverviewTab project={project} />}
      {tab === 'tasks' && <ProjectTasksTab project={project} />}
      {tab === 'members' && <ProjectMembersTab project={project} />}
      {tab === 'activity' && <ProjectActivityTab projectId={project.id} />}
      <ProjectFormModal open={editing} onClose={() => setEditing(false)} project={project} />
    </>
  );
}
