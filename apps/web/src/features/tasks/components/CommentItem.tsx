import { useState } from 'react';
import { Avatar, Icon } from '@/components/ui';
import { formatDateTime, formatRelativeTime } from '@/lib/format-date';
import type { MemberOption, TaskComment, TaskReply } from '../types';
import { CommentComposer } from './CommentComposer';

type AvatarOf = (employeeId: string | null) => string | null;

interface CommentItemProps {
  comment: TaskComment;
  avatarOf: AvatarOf;
  /** null: người xem không bình luận được → không có [Trả lời]. */
  onReply: ((body: string, mentionIds: string[]) => Promise<unknown>) | null;
  isReplying: boolean;
  /** Thành viên board: gợi ý @tên trong ô trả lời. */
  members: MemberOption[];
}

/** Bình luận gốc + các trả lời (1 cấp, thụt vào), [Trả lời] mở ô viết ngay dưới. */
export function CommentItem({ comment, avatarOf, onReply, isReplying, members }: CommentItemProps) {
  const [isOpen, setOpen] = useState(false);
  return (
    <li className="space-y-3">
      <CommentBody comment={comment} avatarOf={avatarOf} />
      {(comment.replies.length > 0 || isOpen) && (
        <ul className="ml-10 space-y-3 border-l border-gray-100 pl-3">
          {comment.replies.map((reply) => (
            <li key={reply.id}>
              <CommentBody comment={reply} avatarOf={avatarOf} />
            </li>
          ))}
          {isOpen && onReply && (
            <li>
              <CommentComposer
                label={`Trả lời ${comment.author.fullName}`}
                placeholder="Viết trả lời…"
                members={members}
                isPending={isReplying}
                autoFocus
                onCancel={() => setOpen(false)}
                onSubmit={async (body, mentionIds) => {
                  await onReply(body, mentionIds);
                  setOpen(false);
                }}
              />
            </li>
          )}
        </ul>
      )}
      {onReply && !isOpen && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-10 inline-flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-primary-700"
        >
          <Icon name="reply" size={14} />
          Trả lời
        </button>
      )}
    </li>
  );
}

function CommentBody({ comment, avatarOf }: { comment: TaskReply; avatarOf: AvatarOf }) {
  const createdAt = new Date(comment.createdAt);
  return (
    <div className="flex gap-3">
      <Avatar name={comment.author.fullName} src={avatarOf(comment.author.employeeId)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium text-gray-900">{comment.author.fullName}</span>{' '}
          <time
            dateTime={comment.createdAt}
            title={formatDateTime(createdAt)}
            className="text-xs text-gray-500"
          >
            {formatRelativeTime(createdAt)}
          </time>
        </p>
        <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{comment.body}</p>
      </div>
    </div>
  );
}
