import type { QueryKey } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button, Input, ModalActions, Select, Textarea } from '@/components/ui';
import { useSubmitTask } from '../hooks/useSubmitTask';
import type { CreateTaskErrors, CreateTaskForm } from '../schemas/task.schema';
import { PRIORITIES, PRIORITY_META } from '../task.utils';
import type { MemberOption, ProjectRef } from '../types';
import { MemberMultiSelect } from './MemberMultiSelect';

export interface CreateTaskFormProps {
  boardId: string;
  departmentName: string;
  members: MemberOption[];
  /** Dự án chưa lưu trữ của phòng (BR-30); rỗng → ẩn ô Dự án. */
  projects: ProjectRef[];
  /** Query cần làm mới thêm sau khi tạo (vd. số liệu thẻ Workspace). */
  relatedKeys: readonly QueryKey[];
  initialTitle?: string;
  onDone: () => void;
}

const emptyForm = (title: string): CreateTaskForm => ({
  title,
  assigneeId: '',
  collaboratorIds: [],
  priority: 'normal',
  startDate: '',
  dueDate: '',
  description: '',
  projectId: '',
});

/** Form "Thêm công việc": 1 request → 1 RPC. department_id tự gán theo Dashboard (BR-11). */
export function CreateTaskForm(props: CreateTaskFormProps) {
  const [form, setForm] = useState(() => emptyForm(props.initialTitle ?? ''));
  const [errors, setErrors] = useState<CreateTaskErrors>({});
  const { submit, isPending } = useSubmitTask(props);
  const update = (changes: Partial<CreateTaskForm>) =>
    setForm((current) => ({ ...current, ...changes }));

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setErrors(await submit(form));
  }

  const memberOptions = props.members.map((member) => ({
    value: member.id,
    label: member.fullName,
  }));
  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label="Tên công việc"
        placeholder="Ví dụ: Thiết kế poster sự kiện"
        value={form.title}
        maxLength={200}
        error={errors.title}
        autoFocus
        onChange={(event) => update({ title: event.target.value })}
      />
      <Select
        label="Người phụ trách chính"
        placeholder="Chọn một người"
        options={memberOptions}
        value={form.assigneeId}
        error={errors.assigneeId}
        onChange={(event) =>
          update({
            assigneeId: event.target.value,
            collaboratorIds: form.collaboratorIds.filter((id) => id !== event.target.value),
          })
        }
      />
      <MemberMultiSelect
        label="Người phối hợp (tuỳ chọn)"
        members={props.members.filter((member) => member.id !== form.assigneeId)}
        value={form.collaboratorIds}
        onChange={(collaboratorIds) => update({ collaboratorIds })}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Input
          type="date"
          label="Ngày bắt đầu"
          value={form.startDate}
          onChange={(event) => update({ startDate: event.target.value })}
        />
        <Input
          type="date"
          label="Hạn"
          value={form.dueDate}
          min={form.startDate || undefined}
          error={errors.dueDate}
          onChange={(event) => update({ dueDate: event.target.value })}
        />
        <Select
          label="Ưu tiên"
          options={PRIORITIES.map((priority) => ({
            value: priority,
            label: PRIORITY_META[priority].label,
          }))}
          value={form.priority}
          onChange={(event) => update({ priority: z.enum(PRIORITIES).parse(event.target.value) })}
        />
      </div>
      {props.projects.length > 0 && (
        <Select
          label="Dự án (tuỳ chọn)"
          placeholder="Không gắn dự án"
          options={props.projects.map((project) => ({ value: project.id, label: project.name }))}
          value={form.projectId}
          error={errors.projectId}
          onChange={(event) => update({ projectId: event.target.value })}
        />
      )}
      <Textarea
        label="Mô tả (tuỳ chọn)"
        value={form.description}
        maxLength={5000}
        error={errors.description}
        onChange={(event) => update({ description: event.target.value })}
      />
      <p className="text-sm text-gray-500">
        Phòng ban: <b className="font-medium text-gray-700">{props.departmentName}</b> (tự gán theo
        Dashboard). Công việc mới nằm đầu cột Việc cần làm.
      </p>
      <ModalActions>
        <Button variant="secondary" onClick={props.onDone}>
          Huỷ
        </Button>
        <Button type="submit" loading={isPending}>
          Thêm công việc
        </Button>
      </ModalActions>
    </form>
  );
}
