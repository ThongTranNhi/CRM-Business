import { Avatar } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { MemberOption } from '../types';

interface MentionSuggestionsProps {
  members: MemberOption[];
  active: number;
  onPick: (member: MemberOption) => void;
}

/** Danh sách gợi ý @tên dưới ô bình luận (thành viên board). */
export function MentionSuggestions({ members, active, onPick }: MentionSuggestionsProps) {
  if (members.length === 0) return null;
  return (
    <ul
      role="listbox"
      aria-label="Nhắc tên thành viên"
      className="max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-sm"
    >
      {members.map((member, index) => (
        <li key={member.id} role="option" aria-selected={index === active}>
          <button
            type="button"
            // Giữ focus ở ô bình luận khi bấm chuột.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(member)}
            className={cn(
              'flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm text-gray-800 hover:bg-gray-50',
              index === active && 'bg-primary-50',
            )}
          >
            <Avatar name={member.fullName} src={member.avatarUrl} size="sm" />
            <span className="truncate">{member.fullName}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
