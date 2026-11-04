import { useMemo, useState } from 'react';
import { Card, EmptyState, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useUrlParams } from '@/lib/use-url-params';
import { OrgChartToolbar } from '../components/OrgChartToolbar';
import { OrgTree } from '../components/OrgTree';
import { useOrgChart } from '../hooks/useOrgChart';
import { useScrollToPerson } from '../hooks/useScrollToPerson';
import { peopleCount, searchOrgChart } from '../org-chart.utils';

/**
 * /app/org-chart — Sơ đồ tổ chức (frontend-spec 4.11). Mọi người xem; ô tìm lưu trên URL `?q=`. Phòng mặc định mở
 * rộng; phòng có người khớp tìm kiếm luôn mở để thấy thẻ được tô sáng.
 */
export function OrgChartPage() {
  const canDo = useCan();
  const [urlParams, updateParams] = useUrlParams();
  const query = urlParams.get('q') ?? '';
  const chart = useOrgChart();
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const search = useMemo(
    () => (chart.data ? searchOrgChart(chart.data, query) : null),
    [chart.data, query],
  );
  useScrollToPerson(search?.personIds[0]);

  const isExpanded = (id: string) => !collapsed.has(id) || Boolean(search?.departmentIds.has(id));
  const toggle = (id: string) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (isExpanded(id)) next.add(id);
      else next.delete(id);
      return next;
    });

  function renderBody() {
    if (chart.isPending) return <Skeleton className="h-96 w-full" />;
    if (chart.isError) {
      return <ErrorState message={chart.error.message} onRetry={() => void chart.refetch()} />;
    }
    if (peopleCount(chart.data) === 0 && chart.data.departments.length === 0) {
      return (
        <Card>
          <EmptyState icon="network" title="Chưa có phòng ban hay nhân viên nào" />
        </Card>
      );
    }
    return (
      <OrgTree
        chart={chart.data}
        isExpanded={isExpanded}
        onToggle={toggle}
        highlightedIds={new Set(search?.personIds)}
        canOpenProfile={canDo('employees.view')}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Sơ đồ tổ chức"
        description="Ban lãnh đạo, phòng ban, trưởng phòng và thành viên của công ty."
      />
      <OrgChartToolbar
        query={query}
        onSearch={(q) => updateParams({ q: q || null })}
        matchCount={search?.personIds.length ?? 0}
        onExpandAll={() => setCollapsed(new Set())}
        onCollapseAll={() =>
          setCollapsed(new Set(chart.data?.departments.map((department) => department.id)))
        }
      />
      {renderBody()}
    </>
  );
}
