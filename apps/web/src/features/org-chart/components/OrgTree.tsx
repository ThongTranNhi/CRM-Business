import type { ReactNode } from 'react';
import type { OrgChart } from '../types';
import { OrgDepartmentNode } from './OrgDepartmentNode';
import { OrgPersonCard } from './OrgPersonCard';

interface OrgTreeProps {
  chart: OrgChart;
  isExpanded: (departmentId: string) => boolean;
  onToggle: (departmentId: string) => void;
  highlightedIds: ReadonlySet<string>;
  canOpenProfile: boolean;
}

/**
 * Cây Ban lãnh đạo → Phòng ban → Thành viên. Màn lớn: các phòng xếp ngang dưới gốc, có đường nối. Màn nhỏ: danh
 * sách thụt lề theo đường kẻ trái (frontend-spec 4.11).
 */
export function OrgTree({ chart, isExpanded, onToggle, ...cards }: OrgTreeProps) {
  const people = (list: OrgChart['leaders']) =>
    list.map((person) => (
      <OrgPersonCard
        key={person.id}
        person={person}
        highlighted={cards.highlightedIds.has(person.id)}
        canOpenProfile={cards.canOpenProfile}
      />
    ));
  return (
    <div className="space-y-6">
      <TreeSection title="Ban lãnh đạo" centered>
        {chart.leaders.length > 0 ? (
          <div className="grid w-full max-w-2xl gap-2 sm:grid-cols-2">{people(chart.leaders)}</div>
        ) : (
          <p className="text-sm text-gray-500">Chưa có tài khoản lãnh đạo.</p>
        )}
      </TreeSection>
      <div>
        <div aria-hidden className="mx-auto hidden h-6 w-px bg-gray-300 lg:block" />
        <ul
          aria-label="Phòng ban"
          className="space-y-4 border-l-2 border-gray-200 pl-4 lg:flex lg:items-start lg:gap-4 lg:space-y-0 lg:overflow-x-auto lg:border-l-0 lg:border-t-2 lg:pb-2 lg:pl-0 lg:pt-6"
        >
          {chart.departments.map((department) => (
            <li key={department.id} className="lg:w-72 lg:shrink-0">
              <OrgDepartmentNode
                department={department}
                expanded={isExpanded(department.id)}
                onToggle={() => onToggle(department.id)}
                {...cards}
              />
            </li>
          ))}
        </ul>
      </div>
      {chart.unassigned.length > 0 && (
        <TreeSection title={`Chưa thuộc phòng ban (${chart.unassigned.length})`}>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{people(chart.unassigned)}</div>
        </TreeSection>
      )}
    </div>
  );
}

interface TreeSectionProps {
  title: string;
  centered?: boolean;
  children: ReactNode;
}

function TreeSection({ title, centered, children }: TreeSectionProps) {
  return (
    <section aria-label={title} className={centered ? 'flex flex-col items-center' : undefined}>
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </section>
  );
}
