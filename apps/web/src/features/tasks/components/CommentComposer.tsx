import { useRef, useState, type KeyboardEvent } from 'react';
import { Button, Textarea } from '@/components/ui';
import { useMentionInput } from '../hooks/useMentionInput';
import { mentionedIds } from '../mention.utils';
import type { MemberOption } from '../types';
import { MentionSuggestions } from './MentionSuggestions';

const BODY_MAX = 5000;

interface CommentComposerProps {
  label: string;
  placeholder: string;
  /** Thành viên board để gợi ý @tên; người được nhắc nhận thông báo (Đợt 3 S3). */
  members: MemberOption[];
  /** Promise reject (lỗi đã báo bằng toast) → giữ nguyên chữ người dùng đã gõ. */
  onSubmit: (body: string, mentionIds: string[]) => Promise<unknown>;
  isPending: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** Ô viết bình luận: gõ @ để nhắc tên, Ctrl + Enter để gửi (bỏ qua khi đang gõ dấu — isComposing). */
export function CommentComposer(props: CommentComposerProps) {
  const [body, setBody] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mention = useMentionInput(inputRef, props.members, body, setBody);
  const text = body.trim();
  const error = text.length > BODY_MAX ? `Bình luận tối đa ${BODY_MAX} ký tự` : undefined;
  const canSend = text.length > 0 && !error && !props.isPending;

  async function send() {
    if (!canSend) return;
    try {
      await props.onSubmit(text, mentionedIds(text, props.members));
      setBody('');
    } catch {
      // Đã có toast lỗi; giữ chữ để gửi lại.
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing || mention.handleKey(event)) return;
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
    if (event.key !== 'Escape') return;
    // Esc đóng ô trả lời; ô bình luận còn chữ chưa gửi thì giữ drawer mở (không mất chữ).
    if (props.onCancel) {
      event.preventDefault();
      props.onCancel();
    } else if (text) {
      event.preventDefault();
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        ref={inputRef}
        aria-label={props.label}
        rows={2}
        value={body}
        placeholder={props.placeholder}
        error={error}
        // Mở ô trả lời → con trỏ vào ô luôn.
        autoFocus={props.autoFocus}
        onChange={(event) => setBody(event.target.value)}
        onSelect={(event) =>
          mention.track(event.currentTarget.value, event.currentTarget.selectionStart)
        }
        onKeyDown={onKeyDown}
      />
      <MentionSuggestions
        members={mention.suggestions}
        active={mention.active}
        onPick={mention.pick}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs text-gray-500">@ để nhắc tên · Ctrl + Enter để gửi</span>
        {props.onCancel && (
          <Button variant="ghost" size="sm" onClick={props.onCancel}>
            Huỷ
          </Button>
        )}
        <Button size="sm" disabled={!canSend} loading={props.isPending} onClick={() => void send()}>
          Gửi
        </Button>
      </div>
    </div>
  );
}
