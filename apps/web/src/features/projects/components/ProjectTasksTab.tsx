import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Badge,
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  Table,
  type TableColumn,
} from '@/components/ui';
import { isOverdue, PRIORITY_META } from '@/features/tasks';
import { todayInVietnam } from '@/lib/format-date';
import { useProjectTasks } from '../hooks/useProjects';
import { formatIsoDate } from '../project.utils';
import type { ProjectDetail, ProjectTask } from '../types';

const STATUS_LABELS: Record<ProjectTask['status'], string> = {
  todo: 'Cần làm',
  in_progress: 'Đang làm',
  done: 'Đã hoàn thành',
};

function columnsFor(dashboardId: string | null, today: string): TableColumn<ProjectTask>[] {
  return [
    {
      key: 'title',
      header: 'Công việc',
      render: (task) =>
        dashboardId ? (
          <Link
            to={`/app/workspace/${dashboardId}?task=${task.id}`}
            className="font-medium text-gray-900 hover:text-primary-700 hover:underline"
          >
            {task.title}
          </Link>
        ) : (
          task.title
        ),
    },
    { key: 'status', header: 'Trạng thái', render: (task) => STATUS_LABELS[task.status] },
    {
      key: 'assignee',
      header: 'Người phụ trách',
      render: (task) => (
        <span className="inline-flex items-center gap-1.5">
          {task.assignee.fullName}
          {task.assignee.isArchived && <Badge tone="warning">Đã nghỉ</Badge>}
        </span>
      ),
    },
    {
      key: 'priority',
      header: 'Ưu tiên',
      render: (task) => (
        <Badge tone={PRIORITY_META[task.priority].tone}>{PRIORITY_META[task.priority].label}</Badge>
      ),
    },
    {
      key: 'due',
      header: 'Hạn',
      render: (task) =>
        isOverdue(task, today) ? (
          <Badge tone="danger">Quá hạn {formatIsoDate(task.dueDate)}</Badge>
        ) : (
          formatIsoDate(task.dueDate)
        ),
    },
  ];
}

/** Tab Công việc: task chưa lưu trữ của dự án; bấm → board `?task=` (drawer chi tiết). */
export function ProjectTasksTab({ project }: { project: ProjectDetail }) {
  const [page, setPage] = useState(1);
  const tasks = useProjectTasks(project.id, page);

  if (tasks.isPending) return <Skeleton className="h-48 w-full" />;
  if (tasks.isError) return <ErrorState onRetry={() => void tasks.refetch()} />;
  if (tasks.data.data.length === 0) {
    return (
      <Card>
        <EmptyState
          icon="checkSquare"
          title="Chưa có công việc nào thuộc dự án"
          description="Chọn dự án này ở ô Dự án khi thêm hoặc sửa công việc trên board của phòng."
          action={
            project.dashboardId && !project.archivedAt ? (
              <ButtonLink to={`/app/workspace/${project.dashboardId}`}>Mở board</ButtonLink>
            ) : undefined
          }
        />
      </Card>
    );
  }
  return (
    <>
      <Table
        caption={`Công việc của dự án ${project.name}`}
        columns={columnsFor(project.dashboardId, todayInVietnam())}
        rows={tasks.data.data}
        getRowKey={(task) => task.id}
      />
      <Pagination {...tasks.data.meta} onChange={setPage} />
    </>
  );
}
