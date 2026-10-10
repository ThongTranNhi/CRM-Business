import type { QueryKey } from '@tanstack/react-query';
import { Button, Skeleton } from '@/components/ui';
import { useAddComment, useComments } from '../hooks/useTaskFeeds';
import { uniqueById } from '../task-detail.utils';
import { CommentComposer } from './CommentComposer';
import { CommentItem } from './CommentItem';
import type { MemberOption } from '../types';
import { DrawerSection, SectionError } from './DrawerSection';

interface TaskCommentsSectionProps {
  taskId: string;
  canComment: boolean;
  avatarOf: (employeeId: string | null) => string | null;
  relatedKeys: readonly QueryKey[];
  /** Thành viên board: gợi ý @tên (người được nhắc nhận thông báo). */
  members: MemberOption[];
}

/** Bình luận: mới nhất dưới cùng, "Xem bình luận cũ hơn" ở trên, trả lời 1 cấp, @nhắc tên. */
export function TaskCommentsSection(props: TaskCommentsSectionProps) {
  const comments = useComments(props.taskId);
  const add = useAddComment(props.taskId, props.relatedKeys);
  // Mỗi trang: bình luận gốc mới nhất trước → đảo lại để cũ ở trên, mới ở dưới.
  const list = uniqueById(comments.data?.pages ?? []).reverse();
  const total = comments.data?.pages[0]?.meta.total ?? 0;
  const pendingParent = add.isPending ? add.variables.parentId : undefined;
  const send = (parentId: string | null) => (body: string, mentionIds: string[]) =>
    add.mutateAsync({ body, parentId, mentionIds });

  function renderList() {
    if (comments.isPending) return <Skeleton className="h-20 w-full" />;
    if (comments.isError) return <SectionError onRetry={() => void comments.refetch()} />;
    if (list.length === 0) return <p className="text-sm text-gray-500">Chưa có bình luận nào.</p>;
    return (
      <>
        {comments.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            loading={comments.isFetchingNextPage}
            onClick={() => void comments.fetchNextPage()}
          >
            Xem bình luận cũ hơn
          </Button>
        )}
        <ul className="space-y-4">
          {list.map((comment) => (
            <CommentItem
              key={comment.id}
              comment={comment}
              avatarOf={props.avatarOf}
              onReply={props.canComment ? send(comment.id) : null}
              members={props.members}
              isReplying={pendingParent === comment.id}
            />
          ))}
        </ul>
      </>
    );
  }

  return (
    <DrawerSection title="Bình luận" aside={total > 0 ? String(total) : undefined}>
      {renderList()}
      {props.canComment && (
        <CommentComposer
          label="Viết bình luận"
          placeholder="Viết bình luận…"
          members={props.members}
          isPending={pendingParent === null}
          onSubmit={send(null)}
        />
      )}
    </DrawerSection>
  );
}
