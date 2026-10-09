import { Badge, Select } from '@/components/ui';
import type { PersonRef } from '@/features/departments';
import { formatDateTime } from '@/lib/format-date';
import { useSetCollaborators, useUpdateTask } from '../hooks/useTaskEdits';
import { PRIORITIES, PRIORITY_META } from '../task.utils';
import type { MemberOption, TaskDetail } from '../types';
import { MemberMultiSelect } from './MemberMultiSelect';
import { ReadOnlyField } from './ReadOnlyField';
import { TaskDateFields } from './TaskDateFields';
import { TaskDescriptionField } from './TaskDescriptionField';
import type { TaskDrawerBoard } from './TaskDrawer';
import { TaskProjectField } from './TaskProjectField';

interface TaskDetailFieldsProps {
  task: TaskDetail;
  board: TaskDrawerBoard;
}

/** Thuộc tính task: sửa tại chỗ theo quyền (canEdit, canReassign), mỗi trường lưu riêng. */
export function TaskDetailFields({ task, board }: TaskDetailFieldsProps) {
  const options = { taskId: task.id, boardKey: board.boardKey, relatedKeys: board.relatedKeys };
  const update = useUpdateTask(options);
  const setCollaborators = useSetCollaborators(options);
  const { canEdit, canReassign } = task.permissions;
  const people = withCurrent(board.members, [task.assignee, ...task.collaborators]);
  const personOf = (id: string) => people.find((person) => person.id === id);

  function reassign(assigneeId: string) {
    const person = personOf(assigneeId);
    if (!person || assigneeId === task.assignee.id) return;
    const assignee = { id: person.id, fullName: person.fullName, isArchived: false };
    // BR-12: người phụ trách mới không còn là người phối hợp.
    const collaborators = task.collaborators.filter(
      (collaborator) => collaborator.id !== assigneeId,
    );
    update.mutate({ changes: { assigneeId }, preview: { assignee, collaborators } });
  }

  return (
    <section aria-label="Thuộc tính" className="grid gap-4 sm:grid-cols-2">
      <ReadOnlyField label="Phòng ban">
        {task.department.name} <span className="text-gray-500">(tự gán theo Dashboard)</span>
      </ReadOnlyField>
      {canReassign ? (
        <div className="space-y-1.5">
          <Select
            label="Người phụ trách"
            value={task.assignee.id}
            options={people.map((person) => ({ value: person.id, label: person.fullName }))}
            onChange={(event) => reassign(event.target.value)}
          />
          {task.assignee.isArchived && (
            <p className="text-sm text-warning-800">
              <Badge tone="warning">Đã nghỉ</Badge> Hãy giao việc này cho người khác.
            </p>
          )}
        </div>
      ) : (
        <ReadOnlyField label="Người phụ trách">
          {task.assignee.fullName}{' '}
          {task.assignee.isArchived && <Badge tone="warning">Đã nghỉ</Badge>}
        </ReadOnlyField>
      )}
      {canEdit ? (
        <Select
          label="Ưu tiên"
          value={task.priority}
          options={PRIORITIES.map((value) => ({ value, label: PRIORITY_META[value].label }))}
          onChange={(event) => {
            const priority = PRIORITIES.find((value) => value === event.target.value);
            if (priority) update.mutate({ changes: { priority }, preview: { priority } });
          }}
        />
      ) : (
        <ReadOnlyField label="Ưu tiên">{PRIORITY_META[task.priority].label}</ReadOnlyField>
      )}
      <TaskDateFields task={task} update={update} />
      <TaskProjectField task={task} projects={board.projects} update={update} />
      <div className="sm:col-span-2">
        {canEdit ? (
          <MemberMultiSelect
            label="Người phối hợp"
            members={people.filter((person) => person.id !== task.assignee.id)}
            value={task.collaborators.map((person) => person.id)}
            onChange={(ids) =>
              setCollaborators.mutate(ids.flatMap((id) => personRefOf(personOf(id))))
            }
          />
        ) : (
          <ReadOnlyField label="Người phối hợp">
            {task.collaborators.map((person) => person.fullName).join(', ') || 'Chưa có'}
          </ReadOnlyField>
        )}
      </div>
      <div className="sm:col-span-2">
        <TaskDescriptionField task={task} update={update} />
      </div>
      <ReadOnlyField label="Người tạo">
        {task.createdBy?.fullName ?? '—'} · {formatDateTime(new Date(task.createdAt))}
      </ReadOnlyField>
      {task.completedAt && (
        <ReadOnlyField label="Hoàn thành">
          {task.completedBy?.fullName ?? '—'} · {formatDateTime(new Date(task.completedAt))}
        </ReadOnlyField>
      )}
    </section>
  );
}

const personRefOf = (person: MemberOption | undefined): PersonRef[] =>
  person ? [{ id: person.id, fullName: person.fullName }] : [];

/** Thành viên board + người đang gắn với task nhưng đã rời phòng (vẫn hiện, vẫn gỡ được). */
function withCurrent(members: MemberOption[], current: PersonRef[]): MemberOption[] {
  // Người phụ trách không đồng thời là người phối hợp (BR-12) → không trùng.
  const missing = current.filter((person) => !members.some((member) => member.id === person.id));
  return [...members, ...missing.map((person) => ({ ...person, avatarUrl: null }))];
}
