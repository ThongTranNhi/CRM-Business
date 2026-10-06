import { cn } from '@/lib/cn';
import { Avatar } from './Avatar';

interface AvatarGroupPerson {
  id: string;
  fullName: string;
  avatarUrl: string | null;
}

interface AvatarGroupProps {
  people: AvatarGroupPerson[];
  /** Tổng số người (có thể lớn hơn số ảnh truyền vào); dư thì hiện "+N". */
  total?: number;
  max?: number;
  className?: string;
}

/** Dãy ảnh đại diện chồng lên nhau, tối đa `max` người. */
export function AvatarGroup({
  people,
  total = people.length,
  max = 4,
  className,
}: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const hidden = total - shown.length;
  return (
    <span
      role="img"
      className={cn('flex items-center -space-x-2', className)}
      aria-label={`${total} người: ${people.map((person) => person.fullName).join(', ')}`}
    >
      {shown.map((person) => (
        <Avatar
          key={person.id}
          name={person.fullName}
          src={person.avatarUrl}
          size="sm"
          className="ring-2 ring-white"
        />
      ))}
      {hidden > 0 && (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-700 ring-2 ring-white">
          +{hidden}
        </span>
      )}
    </span>
  );
}
