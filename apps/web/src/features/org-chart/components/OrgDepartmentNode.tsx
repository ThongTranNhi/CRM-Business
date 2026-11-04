import { Link } from 'react-router-dom';
import { Icon, type BadgeTone } from '@/components/ui';
import { departmentPeople } from '../org-chart.utils';
import type { OrgDepartment, OrgPerson } from '../types';
import { OrgPersonCard } from './OrgPersonCard';

interface OrgDepartmentNodeProps {
  department: OrgDepartment;
  expanded: boolean;
  onToggle: () => void;
  highlightedIds: ReadonlySet<string>;
  canOpenProfile: boolean;
}

const MANAGER_BADGE = { label: 'Trưởng phòng', tone: 'primary' } as const;
const TEAM_LEAD_BADGE = { label: 'Trưởng nhóm', tone: 'info' } as const;

/** Một nhánh phòng ban: tên (→ chi tiết phòng), Trưởng phòng, thành viên thu gọn / mở rộng được. */
export function OrgDepartmentNode({
  department,
  expanded,
  onToggle,
  ...cards
}: OrgDepartmentNodeProps) {
  const total = departmentPeople(department).length;
  const { manager, members } = department;
  const card = (person: OrgPerson, badge?: { label: string; tone: BadgeTone }) => (
    <OrgPersonCard
      key={person.id}
      person={person}
      badge={badge}
      highlighted={cards.highlightedIds.has(person.id)}
      canOpenProfile={cards.canOpenProfile}
    />
  );
  return (
    <div className="space-y-2 rounded-card border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-label={`${expanded ? 'Thu gọn' : 'Mở rộng'} ${department.name}`}
          disabled={members.length === 0}
          className="rounded p-1 text-gray-500 hover:bg-gray-200 disabled:invisible"
        >
          <Icon name={expanded ? 'chevronDown' : 'chevronRight'} size={16} />
        </button>
        <Link
          to={`/app/departments/${department.id}`}
          className="min-w-0 flex-1 truncate font-semibold text-gray-900 hover:underline"
        >
          {department.name}
        </Link>
        <span className="shrink-0 text-xs text-gray-500">{total} người</span>
      </div>
      {manager ? (
        card(manager, MANAGER_BADGE)
      ) : (
        <p className="px-1 text-sm text-gray-500">Chưa có trưởng phòng</p>
      )}
      {members.length > 0 &&
        (expanded ? (
          <div className="space-y-2 border-l-2 border-gray-200 pl-3">
            {members.map((person) =>
              card(person, person.role === 'team_leader' ? TEAM_LEAD_BADGE : undefined),
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="px-1 text-sm text-primary-700 hover:underline"
          >
            + {members.length} thành viên
          </button>
        ))}
    </div>
  );
}
