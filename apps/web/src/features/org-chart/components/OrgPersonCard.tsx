import { Link } from 'react-router-dom';
import { Avatar, Badge, type BadgeTone } from '@/components/ui';
import { cn } from '@/lib/cn';
import { orgPersonAnchor } from '../org-chart.utils';
import type { OrgPerson } from '../types';

interface OrgPersonCardProps {
  person: OrgPerson;
  /** Nhãn vai trò trên sơ đồ, vd. "Trưởng phòng", "Trưởng nhóm". */
  badge?: { label: string; tone: BadgeTone };
  /** Khớp ô tìm kiếm → tô sáng. */
  highlighted: boolean;
  /** Có quyền xem hồ sơ nhân viên → cả thẻ là link sang hồ sơ. */
  canOpenProfile: boolean;
}

/** Thẻ một người: ảnh, tên, chức danh, nhãn vai trò. */
export function OrgPersonCard({ person, badge, highlighted, canOpenProfile }: OrgPersonCardProps) {
  const className = cn(
    'flex min-w-0 items-center gap-2 rounded-lg border bg-white p-2 text-left',
    highlighted ? 'border-primary-500 ring-2 ring-primary-100' : 'border-gray-200',
    canOpenProfile && 'hover:border-primary-300 hover:bg-gray-50',
  );
  const body = (
    <>
      <Avatar name={person.fullName} src={person.avatarUrl} size="md" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-gray-900">{person.fullName}</span>
        <span className="block truncate text-xs text-gray-500">
          {person.jobTitle ?? 'Chưa có chức danh'}
        </span>
      </span>
      {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
    </>
  );
  const anchor = orgPersonAnchor(person.id);
  if (!canOpenProfile) {
    return (
      <div id={anchor} className={className}>
        {body}
      </div>
    );
  }
  return (
    <Link id={anchor} to={`/app/employees/${person.id}`} className={className}>
      {body}
    </Link>
  );
}
