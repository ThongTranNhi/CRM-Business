import { z } from 'zod';
import { useToast } from '@/components/ui';
import { ApiError, errorMessage } from '@/lib/api-client';
import {
  projectFormSchema,
  type ProjectForm,
  type ProjectFormErrors,
} from '../schemas/project.schema';
import type { ProjectDetail, ProjectInput } from '../types';
import { useCreateProject, useUpdateProject } from './useProjectMutations';

/** Lỗi API hiện dưới đúng ô (docs/api/endpoints/projects.md). */
const FIELD_OF_ERROR: Partial<Record<string, keyof ProjectForm>> = {
  PROJECT_NAME_EXISTS: 'name',
  INVALID_DATE_RANGE: 'dueDate',
  PROJECT_MEMBER_NOT_ELIGIBLE: 'ownerEmployeeId',
  DEPARTMENT_NOT_FOUND: 'departmentId',
};

const inputOf = (form: ProjectForm): ProjectInput => ({
  name: form.name,
  description: form.description || null,
  ownerEmployeeId: form.ownerEmployeeId || null,
  status: form.status,
  startDate: form.startDate || null,
  dueDate: form.dueDate || null,
});

/** Chỉ gửi trường đã đổi (PATCH). */
function changesOf(project: ProjectDetail, input: ProjectInput): Partial<ProjectInput> {
  const current: ProjectInput = {
    name: project.name,
    description: project.description,
    ownerEmployeeId: project.owner?.id ?? null,
    status: project.status,
    startDate: project.startDate,
    dueDate: project.dueDate,
  };
  const keys = Object.keys(input) as (keyof ProjectInput)[];
  return Object.fromEntries(
    keys.filter((key) => input[key] !== current[key]).map((key) => [key, input[key]]),
  );
}

/**
 * Validate (zod) rồi tạo / sửa dự án. Trả lỗi theo ô; thành công → toast + `onDone(project)`; lỗi không
 * gắn được với ô nào → toast, giữ nguyên dữ liệu đã nhập.
 */
export function useSubmitProject(
  project: ProjectDetail | undefined,
  onDone: (project: ProjectDetail) => void,
) {
  const toast = useToast();
  const create = useCreateProject();
  const update = useUpdateProject(project?.id ?? '');

  async function save(form: ProjectForm): Promise<ProjectDetail> {
    const input = inputOf(form);
    if (!project) {
      return create.mutateAsync({
        ...input,
        departmentId: form.departmentId,
        memberIds: form.memberIds,
      });
    }
    const changes = changesOf(project, input);
    return Object.keys(changes).length > 0 ? update.mutateAsync(changes) : project;
  }

  async function submit(form: ProjectForm): Promise<ProjectFormErrors> {
    const parsed = projectFormSchema.safeParse(form);
    if (!parsed.success) {
      const fields = z.flattenError(parsed.error).fieldErrors;
      return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value?.[0]]));
    }
    try {
      const saved = await save(parsed.data);
      toast({ message: project ? 'Đã cập nhật dự án' : 'Đã tạo dự án' });
      onDone(saved);
      return {};
    } catch (error) {
      const field = error instanceof ApiError ? FIELD_OF_ERROR[error.code] : undefined;
      if (field) return { [field]: errorMessage(error) };
      toast({ tone: 'error', message: errorMessage(error) });
      return {};
    }
  }

  return { submit, isPending: create.isPending || update.isPending };
}
