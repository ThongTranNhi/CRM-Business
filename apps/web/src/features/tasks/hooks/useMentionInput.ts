import { useState, type KeyboardEvent, type RefObject } from 'react';
import { findMentionQuery, insertMention, matchMembers } from '../mention.utils';
import type { MemberOption } from '../types';

type MentionRange = { start: number; caret: number; query: string };

/**
 * Gợi ý @tên trong ô bình luận: gõ "@" → danh sách thành viên board; ↑/↓ chọn, Enter / Tab chèn, Esc đóng.
 * `track` gọi mỗi khi chữ hoặc con trỏ đổi; `ref` là ô bình luận (đặt lại con trỏ sau khi chèn tên).
 */
export function useMentionInput(
  ref: RefObject<HTMLTextAreaElement | null>,
  members: MemberOption[],
  body: string,
  setBody: (body: string) => void,
) {
  const [range, setRange] = useState<MentionRange | null>(null);
  const [active, setActive] = useState(0);
  const suggestions = range ? matchMembers(members, range.query) : [];

  function track(text: string, caret: number) {
    const found = members.length > 0 ? findMentionQuery(text, caret) : null;
    setRange(found ? { ...found, caret } : null);
    setActive(0);
  }

  function pick(member: MemberOption) {
    if (!range) return;
    const next = insertMention(body, range, member.fullName);
    setBody(next.text);
    setRange(null);
    // Chờ React ghi chữ mới vào ô rồi mới đặt con trỏ sau tên.
    requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(next.caret, next.caret);
    });
  }

  /** true: phím đã dùng cho danh sách gợi ý (ô bình luận không xử lý tiếp). */
  function handleKey(event: KeyboardEvent<HTMLTextAreaElement>): boolean {
    if (suggestions.length === 0) return false;
    const picked = suggestions[active];
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((active + step + suggestions.length) % suggestions.length);
    } else if ((event.key === 'Enter' || event.key === 'Tab') && picked) {
      pick(picked);
    } else if (event.key === 'Escape') {
      setRange(null);
    } else {
      return false;
    }
    event.preventDefault();
    return true;
  }

  return { suggestions, active, track, pick, handleKey };
}
