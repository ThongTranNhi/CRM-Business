import { useState, type KeyboardEvent } from 'react';
import { Icon } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { ChecklistChange } from '../task-detail.utils';
import type { ChecklistItem } from '../types';

interface ChecklistRowProps {
  item: ChecklistItem;
  canEdit: boolean;
  onChange: (change: ChecklistChange) => void;
}

/** Một mục checklist: tick, bấm nội dung để sửa (Enter lưu, Esc huỷ), nút xoá. */
export function ChecklistRow({ item, canEdit, onChange }: ChecklistRowProps) {
  const [draft, setDraft] = useState<string | null>(null);
  // Mục vừa thêm chưa có id thật (đang lưu) → chưa thao tác được.
  const isSaving = item.id.startsWith('new-');
  const isLocked = !canEdit || isSaving;

  function finishEdit() {
    const content = draft?.trim();
    setDraft(null);
    if (content && content !== item.content) {
      onChange({ kind: 'update', itemId: item.id, content });
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter') event.currentTarget.blur();
    if (event.key === 'Escape') {
      event.preventDefault();
      setDraft(null);
    }
  }

  return (
    <li className="flex items-center gap-3 px-3 py-2">
      <input
        type="checkbox"
        aria-label={`Đánh dấu xong: ${item.content}`}
        checked={item.isDone}
        disabled={isLocked}
        onChange={() => onChange({ kind: 'update', itemId: item.id, isDone: !item.isDone })}
        className="h-4 w-4 accent-primary-500"
      />
      {draft !== null ? (
        <input
          aria-label="Sửa mục checklist"
          // Người dùng vừa bấm vào nội dung để sửa → focus luôn ô nhập.
          autoFocus
          value={draft}
          maxLength={500}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={finishEdit}
          onKeyDown={onKeyDown}
          className="h-8 min-w-0 flex-1 rounded-md border border-gray-200 px-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
        />
      ) : (
        <button
          type="button"
          disabled={isLocked}
          onClick={() => setDraft(item.content)}
          className={cn(
            'min-w-0 flex-1 truncate text-left text-sm text-gray-900 disabled:cursor-default',
            item.isDone && 'text-gray-500 line-through',
          )}
        >
          {item.content}
        </button>
      )}
      {!isLocked && (
        <button
          type="button"
          aria-label={`Xoá mục: ${item.content}`}
          onClick={() => onChange({ kind: 'remove', itemId: item.id })}
          className="rounded-md p-1 text-gray-500 hover:bg-danger-50 hover:text-danger-700"
        >
          <Icon name="trash" size={16} />
        </button>
      )}
    </li>
  );
}
