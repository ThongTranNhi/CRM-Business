import { useState } from 'react';
import { Button, ButtonLink, ConfirmDialog, Icon, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useArchiveProject } from '../hooks/useProjectMutations';
import type { ProjectDetail } from '../types';

interface ProjectActionsProps {
  project: ProjectDetail;
  onEdit: () => void;
}

/** [Mở trên board] (lọc ?project=), [Sửa], [Lưu trữ] / [Khôi phục] theo quyền của người xem. */
export function ProjectActions({ project, onEdit }: ProjectActionsProps) {
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const { archive, restore } = useArchiveProject(project.id);
  const isArchived = project.archivedAt !== null;
  const { canEdit, canArchive } = project.permissions;

  async function run(action: typeof archive | typeof restore, message: string) {
    try {
      await action.mutateAsync();
      toast({ message });
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  return (
    <>
      {project.dashboardId && !isArchived && (
        <ButtonLink
          variant="secondary"
          to={`/app/workspace/${project.dashboardId}?project=${project.id}`}
        >
          <Icon name="grid" size={18} />
          Mở trên board
        </ButtonLink>
      )}
      {canEdit && !isArchived && (
        <Button variant="secondary" onClick={onEdit}>
          <Icon name="edit" size={18} />
          Sửa
        </Button>
      )}
      {canArchive && !isArchived && (
        <Button variant="secondary" onClick={() => setConfirming(true)}>
          <Icon name="package" size={18} />
          Lưu trữ
        </Button>
      )}
      {canArchive && isArchived && (
        <Button
          loading={restore.isPending}
          onClick={() => void run(restore, `Đã khôi phục dự án ${project.name}`)}
        >
          <Icon name="restore" size={18} />
          Khôi phục
        </Button>
      )}
      <ConfirmDialog
        open={confirming}
        title="Lưu trữ dự án"
        description={`Lưu trữ dự án '${project.name}'? Dự án ẩn khỏi danh sách và ô chọn dự án; công việc vẫn giữ nguyên. Có thể khôi phục ở bộ lọc "Đã lưu trữ".`}
        confirmLabel="Lưu trữ"
        tone="primary"
        loading={archive.isPending}
        onConfirm={() =>
          void run(archive, `Đã lưu trữ dự án ${project.name}`).then(() => setConfirming(false))
        }
        onClose={() => setConfirming(false)}
      />
    </>
  );
}
