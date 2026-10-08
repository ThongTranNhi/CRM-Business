import { useState, type KeyboardEvent } from 'react';
import { Button, Textarea } from '@/components/ui';
import type { TaskUpdater } from '../hooks/useTaskEdits';
import type { TaskDetail } from '../types';

const DESCRIPTION_MAX = 5000;

interface TaskDescriptionFieldProps {
  task: TaskDetail;
  update: TaskUpdater;
}

/** Mô tả: sửa trong Textarea, hiện [Lưu] / [Huỷ] khi có thay đổi. Chỉ đọc → văn bản giữ xuống dòng. */
export function TaskDescriptionField({ task, update }: TaskDescriptionFieldProps) {
  const saved = task.description ?? '';
  const [draft, setDraft] = useState(saved);
  // Mô tả đổi từ nơi khác (tải lại) khi đang không sửa → ô nhập theo luôn.
  const [lastSaved, setLastSaved] = useState(saved);
  if (saved !== lastSaved) {
    setLastSaved(saved);
    if (draft === lastSaved) setDraft(saved);
  }

  if (!task.permissions.canEdit) {
    return (
      <div className="space-y-1.5">
        <p className="text-sm font-medium text-gray-700">Mô tả</p>
        <p className="whitespace-pre-wrap text-sm text-gray-900">{saved || 'Chưa có mô tả'}</p>
      </div>
    );
  }

  const isDirty = draft.trim() !== saved;
  const error =
    draft.trim().length > DESCRIPTION_MAX ? `Mô tả tối đa ${DESCRIPTION_MAX} ký tự` : undefined;

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    // Esc khi còn chữ chưa lưu: giữ drawer mở, không mất nội dung đang sửa.
    if (event.key === 'Escape' && isDirty) event.preventDefault();
  }

  function save() {
    const description = draft.trim() || null;
    update.mutate({ changes: { description }, preview: { description } });
  }

  return (
    <div className="space-y-2">
      <Textarea
        label="Mô tả"
        rows={4}
        value={draft}
        placeholder="Thêm mô tả chi tiết cho công việc"
        error={error}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {isDirty && (
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDraft(saved)}>
            Huỷ
          </Button>
          <Button size="sm" disabled={Boolean(error)} loading={update.isPending} onClick={save}>
            Lưu mô tả
          </Button>
        </div>
      )}
    </div>
  );
}
