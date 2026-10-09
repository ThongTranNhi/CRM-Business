import { useState } from 'react';
import { Button, ErrorState, Modal, ModalActions, Skeleton, useToast } from '@/components/ui';
import { MemberMultiSelect } from '@/features/tasks';
import { errorMessage } from '@/lib/api-client';
import { useSetProjectMembers } from '../hooks/useProjectMutations';
import { useEligibleMembers } from '../hooks/useProjects';
import type { ProjectDetail } from '../types';

interface EditMembersModalProps {
  project: ProjectDetail;
  open: boolean;
  onClose: () => void;
}

/** Chọn thành viên dự án trong số người của phòng / được mời vào board (Q6). Chủ dự án luôn ở lại. */
export function EditMembersModal({ project, open, onClose }: EditMembersModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Thành viên dự án">
      <MembersForm project={project} onDone={onClose} />
    </Modal>
  );
}

function MembersForm({ project, onDone }: { project: ProjectDetail; onDone: () => void }) {
  const toast = useToast();
  const eligible = useEligibleMembers({ projectId: project.id });
  const save = useSetProjectMembers(project.id);
  const ownerId = project.owner?.id ?? null;
  const [selected, setSelected] = useState(() =>
    project.members.map((member) => member.id).filter((id) => id !== ownerId),
  );

  async function submit() {
    try {
      await save.mutateAsync(ownerId ? [ownerId, ...selected] : selected);
      toast({ message: 'Đã cập nhật thành viên dự án' });
      onDone();
    } catch (error) {
      toast({ tone: 'error', message: errorMessage(error) });
    }
  }

  if (eligible.isPending) return <Skeleton className="h-40 w-full" />;
  if (eligible.isError) return <ErrorState onRetry={() => void eligible.refetch()} />;
  // Thành viên cũ đã rời phòng vẫn hiện để gỡ được.
  const former = project.members.filter(
    (member) => !eligible.data.some((person) => person.id === member.id),
  );
  const options = [...eligible.data, ...former].filter((person) => person.id !== ownerId);
  return (
    <div className="space-y-4">
      {project.owner && (
        <p className="text-sm text-gray-600">
          Chủ dự án <b className="font-medium text-gray-900">{project.owner.fullName}</b> luôn là
          thành viên.
        </p>
      )}
      <MemberMultiSelect
        label="Thành viên"
        members={options}
        value={selected}
        onChange={setSelected}
      />
      <ModalActions>
        <Button variant="secondary" onClick={onDone}>
          Huỷ
        </Button>
        <Button loading={save.isPending} onClick={() => void submit()}>
          Lưu thành viên
        </Button>
      </ModalActions>
    </div>
  );
}
