import type { QueryKey } from '@tanstack/react-query';
import { useState, type KeyboardEvent } from 'react';
import { ProgressBar, Skeleton } from '@/components/ui';
import { useChecklist, useChecklistChange } from '../hooks/useChecklist';
import { checklistCounts } from '../task-detail.utils';
import { checklistPercent } from '../task.utils';
import { ChecklistRow } from './ChecklistRow';
import { DrawerSection, SectionError } from './DrawerSection';

const CONTENT_MAX = 500;

interface TaskChecklistSectionProps {
  taskId: string;
  canEdit: boolean;
  boardKey: QueryKey;
}

/** Checklist (BR-17): thêm (Enter), sửa, tick, xoá; % tiến độ; thẻ board cập nhật x/y. */
export function TaskChecklistSection({ taskId, canEdit, boardKey }: TaskChecklistSectionProps) {
  const checklist = useChecklist(taskId);
  const change = useChecklistChange(taskId, boardKey);
  const items = checklist.data ?? [];
  const counts = checklistCounts(items);
  const percent = checklistPercent(counts);

  function renderBody() {
    if (checklist.isPending) return <Skeleton className="h-16 w-full" />;
    if (checklist.isError) return <SectionError onRetry={() => void checklist.refetch()} />;
    return (
      <>
        {percent !== null && <ProgressBar value={percent} label={`Checklist ${percent}%`} />}
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có mục nào trong checklist.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {items.map((item) => (
              <ChecklistRow key={item.id} item={item} canEdit={canEdit} onChange={change.mutate} />
            ))}
          </ul>
        )}
        {canEdit && <AddItemInput onAdd={(content) => change.mutate({ kind: 'add', content })} />}
      </>
    );
  }

  return (
    <DrawerSection
      title="Checklist"
      aside={counts.total > 0 ? `${counts.done}/${counts.total}` : undefined}
    >
      {renderBody()}
    </DrawerSection>
  );
}

/** Ô thêm mục: Enter để thêm (bỏ qua khi đang gõ dấu tiếng Việt — isComposing). */
function AddItemInput({ onAdd }: { onAdd: (content: string) => void }) {
  const [text, setText] = useState('');

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' || event.nativeEvent.isComposing) return;
    event.preventDefault();
    const content = text.trim();
    if (!content) return;
    onAdd(content);
    setText('');
  }

  return (
    <input
      aria-label="Thêm mục checklist"
      placeholder="+ Thêm mục, nhấn Enter để lưu"
      value={text}
      maxLength={CONTENT_MAX}
      onChange={(event) => setText(event.target.value)}
      onKeyDown={onKeyDown}
      className="block h-10 w-full rounded-lg border border-dashed border-gray-300 bg-white px-3 text-sm text-gray-900 placeholder:text-gray-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-100"
    />
  );
}
