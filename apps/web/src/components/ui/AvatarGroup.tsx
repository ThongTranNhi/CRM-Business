import { Link } from 'react-router-dom';
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
  /** Có: mỗi ảnh là link (vd. tới hồ sơ nhân viên). Không: chỉ hiển thị, tên ở tooltip. */
  hrefOf?: (personId: string) => string;
  className?: string;
}

const RING = 'ring-2 ring-white';

/** Dãy ảnh đại diện chồng lên nhau, tối đa `max` người. */
export function AvatarGroup({
  people,
  total = people.length,
  max = 4,
  hrefOf,
  className,
}: AvatarGroupProps) {
  const shown = people.slice(0, max);
  const hidden = total - shown.length;
  const label = `${total} người: ${people.map((person) => person.fullName).join(', ')}`;
  return (
    <span
      // Có link → nhóm điều khiển; không link → một hình có mô tả.
      role={hrefOf ? 'group' : 'img'}
      aria-label={label}
      className={cn('flex items-center -space-x-2', className)}
    >
      {shown.map((person) => {
        const avatar = (
          <Avatar name={person.fullName} src={person.avatarUrl} size="sm" className={RING} />
        );
        if (!hrefOf) return <span key={person.id}>{avatar}</span>;
        return (
          <Link
            key={person.id}
            to={hrefOf(person.id)}
            aria-label={person.fullName}
            title={person.fullName}
            className="rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300"
          >
            {avatar}
          </Link>
        );
      })}
      {hidden > 0 && (
        <span
          className={cn(
            'inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-gray-100 px-1.5 text-xs font-medium text-gray-700',
            RING,
          )}
        >
          +{hidden}
        </span>
      )}
    </span>
  );
}
