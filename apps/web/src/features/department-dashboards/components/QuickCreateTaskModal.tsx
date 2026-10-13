import { useState } from 'react';
import { EmptyState, ErrorState, Modal, Select, Skeleton } from '@/components/ui';
import { CreateTaskForm } from '@/features/tasks';
import { BOARD_RELATED_KEYS } from '../hooks/board-related-keys';
import { useDashboard } from '../hooks/useDashboard';
import { useDashboards } from '../hooks/useDashboards';

interface QuickCreateTaskModalProps {
  onClose: () => void;
}

/** "+ Tạo nhanh" → Công việc mới (frontend-spec 3.2): chọn Dashboard ghi được → form Thêm công việc. */
export function QuickCreateTaskModal({ onClose }: QuickCreateTaskModalProps) {
  const dashboards = useDashboards();
  const writable = (dashboards.data ?? []).filter((dashboard) => !dashboard.isReadOnly);
  const [picked, setPicked] = useState('');
  // Chỉ một Dashboard ghi được → chọn sẵn.
  const dashboardId = picked || (writable.length === 1 ? (writable[0]?.id ?? '') : '');

  function renderBody() {
    if (dashboards.isPending) return <Skeleton className="h-24 w-full" />;
    if (dashboards.isError) return <ErrorState onRetry={() => void dashboards.refetch()} />;
    if (writable.length === 0) {
      return (
        <EmptyState
          icon="grid"
          title="Chưa có Dashboard nào bạn thêm việc được"
          description="Công việc được tạo trong Dashboard của phòng ban bạn thuộc về hoặc được mời vào."
        />
      );
    }
    return (
      <div className="space-y-4">
        <Select
          label="Dashboard"
          placeholder="Chọn Dashboard"
          options={writable.map((dashboard) => ({ value: dashboard.id, label: dashboard.name }))}
          value={dashboardId}
          onChange={(event) => setPicked(event.target.value)}
        />
        {dashboardId && (
          <TaskFormFor key={dashboardId} dashboardId={dashboardId} onDone={onClose} />
        )}
      </div>
    );
  }

  return (
    <Modal open onClose={onClose} title="Công việc mới">
      {renderBody()}
    </Modal>
  );
}

function TaskFormFor({ dashboardId, onDone }: { dashboardId: string; onDone: () => void }) {
  const dashboard = useDashboard(dashboardId);
  if (dashboard.isPending) return <Skeleton className="h-48 w-full" />;
  if (dashboard.isError) return <ErrorState onRetry={() => void dashboard.refetch()} />;
  const { data } = dashboard;
  return (
    <CreateTaskForm
      boardId={data.boardId}
      departmentName={data.department.name}
      members={data.members}
      projects={data.projects}
      relatedKeys={BOARD_RELATED_KEYS}
      onDone={onDone}
    />
  );
}
