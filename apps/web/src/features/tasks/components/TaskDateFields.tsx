import { useState } from 'react';
import { Input } from '@/components/ui';
import type { TaskUpdater } from '../hooks/useTaskEdits';
import { isDateRangeValid } from '../task-detail.utils';
import type { TaskDetail } from '../types';
import { ReadOnlyField } from './ReadOnlyField';

const RANGE_ERROR = 'Hạn không được trước ngày bắt đầu';

interface TaskDateFieldsProps {
  task: TaskDetail;
  update: TaskUpdater;
}

const showDate = (isoDate: string | null) =>
  isoDate ? isoDate.split('-').reverse().join('/') : 'Chưa đặt';

/** Ngày bắt đầu và hạn (hạn ≥ bắt đầu); chọn xong là lưu, xoá ngày = bỏ trống. */
export function TaskDateFields({ task, update }: TaskDateFieldsProps) {
  const [error, setError] = useState<string | null>(null);
  if (!task.permissions.canEdit) {
    return (
      <>
        <ReadOnlyField label="Ngày bắt đầu">{showDate(task.startDate)}</ReadOnlyField>
        <ReadOnlyField label="Hạn">{showDate(task.dueDate)}</ReadOnlyField>
      </>
    );
  }

  function save(field: 'startDate' | 'dueDate', value: string) {
    const date = value || null;
    if (date === task[field]) return;
    const next = { startDate: task.startDate, dueDate: task.dueDate, [field]: date };
    if (!isDateRangeValid(next.startDate, next.dueDate)) return setError(RANGE_ERROR);
    setError(null);
    update.mutate({ changes: { [field]: date }, preview: { [field]: date } });
  }

  return (
    <>
      <Input
        type="date"
        label="Ngày bắt đầu"
        value={task.startDate ?? ''}
        max={task.dueDate ?? undefined}
        onChange={(event) => save('startDate', event.target.value)}
      />
      <Input
        type="date"
        label="Hạn"
        value={task.dueDate ?? ''}
        min={task.startDate ?? undefined}
        error={error ?? undefined}
        onChange={(event) => save('dueDate', event.target.value)}
      />
    </>
  );
}
