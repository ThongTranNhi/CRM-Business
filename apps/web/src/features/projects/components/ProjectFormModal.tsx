import { useState, type FormEvent } from 'react';
import { Button, Modal, ModalActions } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useEligibleMembers } from '../hooks/useProjects';
import { useSubmitProject } from '../hooks/useSubmitProject';
import type { ProjectForm, ProjectFormErrors } from '../schemas/project.schema';
import type { ProjectDetail } from '../types';
import { ProjectFormFields } from './ProjectFormFields';

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  /** Có: sửa dự án này (không đổi phòng ban, thành viên sửa ở tab Thành viên). Không: tạo mới. */
  project?: ProjectDetail;
  /** Sau khi tạo mới (vd. mở trang chi tiết dự án vừa tạo). */
  onCreated?: (project: ProjectDetail) => void;
}

/** Tạo / sửa dự án (BR-30): thuộc 1 phòng ban; chủ dự án, thành viên chỉ người của phòng (Q6). */
export function ProjectFormModal({ open, onClose, project, onCreated }: ProjectFormModalProps) {
  return (
    <Modal open={open} onClose={onClose} title={project ? 'Sửa dự án' : 'Tạo dự án'}>
      <ProjectFormBody
        project={project}
        onDone={(saved) => {
          if (!project) onCreated?.(saved);
          onClose();
        }}
        onCancel={onClose}
      />
    </Modal>
  );
}

function initialForm(project: ProjectDetail | undefined, departmentId: string): ProjectForm {
  return {
    departmentId: project?.department.id ?? departmentId,
    name: project?.name ?? '',
    description: project?.description ?? '',
    ownerEmployeeId: project?.owner?.id ?? '',
    status: project?.status ?? 'planning',
    startDate: project?.startDate ?? '',
    dueDate: project?.dueDate ?? '',
    memberIds: [],
  };
}

interface ProjectFormBodyProps {
  project: ProjectDetail | undefined;
  onDone: (project: ProjectDetail) => void;
  onCancel: () => void;
}

function ProjectFormBody({ project, onDone, onCancel }: ProjectFormBodyProps) {
  const { data: user } = useCurrentUser();
  // Trưởng phòng: phòng mình quản lý được chọn sẵn; Super Admin chọn phòng.
  const [form, setForm] = useState(() =>
    initialForm(project, user?.role === 'super_admin' ? '' : (user?.managedDepartmentId ?? '')),
  );
  const [errors, setErrors] = useState<ProjectFormErrors>({});
  const { submit, isPending } = useSubmitProject(project, onDone);
  const eligible = useEligibleMembers(
    project
      ? { projectId: project.id }
      : form.departmentId
        ? { departmentId: form.departmentId }
        : null,
  );

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors(await submit(form));
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <ProjectFormFields
        form={form}
        errors={errors}
        isEditing={Boolean(project)}
        eligible={eligible}
        onChange={(changes) => setForm((current) => ({ ...current, ...changes }))}
      />
      <ModalActions>
        <Button variant="secondary" onClick={onCancel}>
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          {project ? 'Lưu thay đổi' : 'Tạo dự án'}
        </Button>
      </ModalActions>
    </form>
  );
}
