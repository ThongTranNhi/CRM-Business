import type { QueryKey } from '@tanstack/react-query';
import { Button, Icon, Skeleton, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api-client';
import { useAddTaskLink, useRemoveTaskLink, useTaskLinks } from '../hooks/useTaskLinks';
import type { TaskLink } from '../types';
import { AddTaskLinkForm } from './AddTaskLinkForm';
import { DrawerSection, SectionError } from './DrawerSection';

const LINK_LIMIT = 10;

interface TaskLinksSectionProps {
  taskId: string;
  canEdit: boolean;
  boardKey: QueryKey;
}

/** Link kết quả / tài liệu (OneDrive, bài viết, .docx…): mọi trạng thái, tối đa 10; người sửa được việc thêm / xoá. */
export function TaskLinksSection({ taskId, canEdit, boardKey }: TaskLinksSectionProps) {
  const toast = useToast();
  const links = useTaskLinks(taskId);
  const add = useAddTaskLink(taskId, boardKey);
  const remove = useRemoveTaskLink(taskId, boardKey);
  const items = links.data ?? [];

  function renderBody() {
    if (links.isPending) return <Skeleton className="h-12 w-full" />;
    if (links.isError) return <SectionError onRetry={() => void links.refetch()} />;
    return (
      <>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500">Chưa có link kết quả hay tài liệu nào.</p>
        ) : (
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            {items.map((link) => (
              <LinkRow
                key={link.id}
                link={link}
                canEdit={canEdit}
                onRemove={() =>
                  remove.mutate(link.id, {
                    onError: (error) => toast({ tone: 'error', message: errorMessage(error) }),
                  })
                }
              />
            ))}
          </ul>
        )}
        {canEdit && items.length < LINK_LIMIT && (
          <AddTaskLinkForm isPending={add.isPending} onAdd={add.mutateAsync} />
        )}
      </>
    );
  }

  return (
    <DrawerSection
      title="Link kết quả / tài liệu"
      aside={items.length > 0 ? `${items.length}/${LINK_LIMIT}` : undefined}
    >
      {renderBody()}
    </DrawerSection>
  );
}

interface LinkRowProps {
  link: TaskLink;
  canEdit: boolean;
  onRemove: () => void;
}

/** Một link: tên (hoặc chính link) mở tab mới; link đầy đủ hiện nhỏ bên dưới khi có tên. */
function LinkRow({ link, canEdit, onRemove }: LinkRowProps) {
  const label = link.title ?? link.url;
  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <Icon name="link" size={16} className="shrink-0 text-gray-400" />
      <div className="min-w-0 flex-1">
        {/* noopener noreferrer: trang được mở không điều khiển được tab CRM. */}
        <a
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate text-sm font-medium text-primary-700 hover:underline"
          title={link.url}
        >
          {label}
        </a>
        {link.title && <p className="truncate text-xs text-gray-500">{link.url}</p>}
      </div>
      {canEdit && (
        <Button variant="ghost" size="sm" aria-label={`Xoá link ${label}`} onClick={onRemove}>
          <Icon name="trash" size={16} />
        </Button>
      )}
    </li>
  );
}
