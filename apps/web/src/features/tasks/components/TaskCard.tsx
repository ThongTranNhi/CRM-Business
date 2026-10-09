import type { HTMLAttributes, KeyboardEvent, MouseEvent, ReactNode } from 'react';
import { Avatar, AvatarGroup, Badge, Icon, ProgressBar } from '@/components/ui';
import { cn } from '@/lib/cn';
import { checklistPercent, dueBadge, PRIORITY_META } from '../task.utils';
import type { BoardTask } from '../types';

interface TaskCardProps {
  task: BoardTask;
  /** YYYY-MM-DD theo giờ Việt Nam (BR-16). */
  today: string;
  /** Ảnh đại diện theo employeeId (từ danh sách thành viên Dashboard); không có → chữ viết tắt. */
  avatarOf: (employeeId: string) => string | null;
  /** draggable + sự kiện kéo do board truyền vào khi người xem được kéo thẻ. */
  dragProps?: HTMLAttributes<HTMLElement> & { draggable?: boolean };
  isDragging?: boolean;
  /** Menu "Chuyển sang cột…" (cảm ứng, bàn phím). */
  moveMenu?: ReactNode;
  /** Menu ⋯ (vd. Xoá công việc) ở góc phải, cạnh tên. */
  actionsMenu?: ReactNode;
  /** Mở drawer chi tiết: bấm thẻ hoặc Enter khi thẻ đang focus. */
  onOpen?: () => void;
}

/** Bấm vào nút / ô chọn bên trong thẻ (menu, chuyển cột) thì không mở chi tiết. */
const isFromControl = (event: MouseEvent<HTMLElement>) =>
  event.target instanceof Element &&
  event.target.closest('button, select, a, input, [role="menu"]') !== null;

/** Thẻ task trên board (task-management.md, demo): tên, ưu tiên, hạn, checklist, người phụ trách. */
export function TaskCard({
  task,
  today,
  avatarOf,
  dragProps,
  isDragging,
  moveMenu,
  actionsMenu,
  onOpen,
}: TaskCardProps) {
  const priority = PRIORITY_META[task.priority];
  const due = dueBadge(task, today);
  const percent = checklistPercent(task.checklist);
  const isDone = task.status === 'done';
  return (
    <article
      data-task-card={task.id}
      aria-label={task.title}
      // Tab tới được thẻ (bàn phím); focus trong thẻ làm hiện menu chuyển cột.
      tabIndex={0}
      onClick={(event) => {
        if (onOpen && !isFromControl(event)) onOpen();
      }}
      onKeyDown={(event: KeyboardEvent<HTMLElement>) => {
        if (onOpen && event.key === 'Enter' && event.target === event.currentTarget) {
          event.preventDefault();
          onOpen();
        }
      }}
      className={cn(
        'group grid gap-2.5 rounded-lg border border-gray-200 bg-white p-3 shadow-sm',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300',
        onOpen && 'cursor-pointer hover:border-primary-300',
        dragProps?.draggable && 'cursor-grab hover:border-primary-300',
        isDone && 'opacity-70',
        isDragging && 'opacity-40',
      )}
      {...dragProps}
    >
      <div className="flex items-start gap-2">
        <p
          className={cn(
            'min-w-0 flex-1 text-sm font-medium leading-snug text-gray-900',
            isDone && 'text-gray-500 line-through decoration-gray-300',
          )}
        >
          {task.title}
        </p>
        {actionsMenu}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Badge tone={priority.tone}>{priority.label}</Badge>
        {due && (
          <Badge tone={due.tone}>
            {due.isDone && <Icon name="check" size={12} />}
            {due.label}
          </Badge>
        )}
        {task.assignee.isArchived && <Badge tone="warning">Đã nghỉ</Badge>}
      </div>
      {task.project && (
        <p className="flex items-center gap-1 truncate text-xs text-gray-500" title="Dự án">
          <Icon name="folder" size={12} />
          <span className="truncate">{task.project.name}</span>
        </p>
      )}
      {percent !== null && <ProgressBar value={percent} label={`Checklist ${percent}%`} />}
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">
          <Avatar name={task.assignee.fullName} src={avatarOf(task.assignee.id)} size="sm" />
          <span className="truncate">{task.assignee.fullName}</span>
        </span>
        {task.collaborators.length > 0 && (
          <AvatarGroup
            max={2}
            people={task.collaborators.map((person) => ({
              ...person,
              avatarUrl: avatarOf(person.id),
            }))}
          />
        )}
        {task.checklist.total > 0 && (
          <span className="inline-flex items-center gap-0.5" title="Checklist">
            <Icon name="list" size={14} />
            {task.checklist.done}/{task.checklist.total}
          </span>
        )}
        {task.commentCount > 0 && (
          <span className="inline-flex items-center gap-0.5" title="Bình luận">
            <Icon name="message" size={14} />
            {task.commentCount}
          </span>
        )}
      </div>
      {moveMenu && (
        // Máy có chuột: ẩn hẳn (invisible — không bấm trúng khi đang ẩn), hiện khi rê chuột hoặc focus
        // trong thẻ. Màn hình cảm ứng: luôn hiện.
        <div className="[@media(hover:hover)]:invisible [@media(hover:hover)]:group-focus-within:visible [@media(hover:hover)]:group-hover:visible">
          {moveMenu}
        </div>
      )}
    </article>
  );
}
