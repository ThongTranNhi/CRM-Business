import { useState, type KeyboardEvent } from 'react';
import { Button, Textarea } from '@/components/ui';

const BODY_MAX = 5000;

interface CommentComposerProps {
  label: string;
  placeholder: string;
  /** Promise reject (lỗi đã báo bằng toast) → giữ nguyên chữ người dùng đã gõ. */
  onSubmit: (body: string) => Promise<unknown>;
  isPending: boolean;
  onCancel?: () => void;
  autoFocus?: boolean;
}

/** Ô viết bình luận: Ctrl + Enter để gửi (bỏ qua khi đang gõ dấu — isComposing), [Gửi]. */
export function CommentComposer(props: CommentComposerProps) {
  const [body, setBody] = useState('');
  const text = body.trim();
  const error = text.length > BODY_MAX ? `Bình luận tối đa ${BODY_MAX} ký tự` : undefined;
  const canSend = text.length > 0 && !error && !props.isPending;

  async function send() {
    if (!canSend) return;
    try {
      await props.onSubmit(text);
      setBody('');
    } catch {
      // Đã có toast lỗi; giữ chữ để gửi lại.
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void send();
    }
    if (event.key === 'Escape' && props.onCancel) {
      // Esc đóng ô trả lời, không đóng drawer.
      event.preventDefault();
      props.onCancel();
    }
  }

  return (
    <div className="space-y-2">
      <Textarea
        aria-label={props.label}
        rows={2}
        value={body}
        placeholder={props.placeholder}
        error={error}
        // Mở ô trả lời → con trỏ vào ô luôn.
        autoFocus={props.autoFocus}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={onKeyDown}
      />
      <div className="flex items-center justify-end gap-2">
        <span className="mr-auto text-xs text-gray-500">Ctrl + Enter để gửi</span>
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
