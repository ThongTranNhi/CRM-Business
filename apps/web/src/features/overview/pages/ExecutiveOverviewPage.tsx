import { Card, ErrorState, PageHeader, Skeleton, Tabs } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { useUrlParams } from '@/lib/use-url-params';
import { DepartmentTaskChart } from '../components/DepartmentTaskChart';
import { ExecutiveStatCards } from '../components/ExecutiveStatCards';
import { OverloadedList } from '../components/OverloadedList';
import { OverviewSection } from '../components/OverviewSection';
import { ProjectProgressList } from '../components/ProjectProgressList';
import { UpcomingTaskList } from '../components/UpcomingTaskList';
import { PERIOD_LABELS, readPeriod } from '../executive.utils';
import { useExecutiveOverview } from '../hooks/useExecutiveOverview';
import { OVERVIEW_PERIODS, type OverviewPeriod } from '../types';

const PERIOD_TABS = OVERVIEW_PERIODS.map((value) => ({ value, label: PERIOD_LABELS[value] }));

/**
 * /app/overview — Tổng quan điều hành (frontend-spec 4.7, chốt 22/10/2026). Super Admin mọi phòng; Trưởng phòng
 * phòng mình (server lọc). Kỳ trên URL `?period=`; thẻ số và biểu đồ phòng ban tính việc tạo trong kỳ, các khối
 * còn lại là hiện tại. Khối Nhân sự hôm nay thêm ở Đợt 5.
 */
export function ExecutiveOverviewPage() {
  const { data: user } = useCurrentUser();
  const [params, updateParams] = useUrlParams();
  const period = readPeriod(params);
  const scope = user?.role === 'super_admin' ? 'Toàn công ty' : 'Phòng của bạn';
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan điều hành"
        description={`${scope} — số việc tạo trong ${PERIOD_LABELS[period].toLowerCase()}`}
      />
      <Tabs<OverviewPeriod>
        label="Kỳ thống kê"
        items={PERIOD_TABS}
        value={period}
        onChange={(value) => updateParams({ period: value === 'month' ? null : value })}
      />
      <ExecutiveContent period={period} />
    </div>
  );
}

function ExecutiveContent({ period }: { period: OverviewPeriod }) {
  const overview = useExecutiveOverview(period);
  if (overview.isPending) {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {['total', 'todo', 'doing', 'done', 'late'].map((key) => (
            <Skeleton key={key} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </>
    );
  }
  if (overview.isError) {
    return (
      <Card>
        <ErrorState message={overview.error.message} onRetry={() => void overview.refetch()} />
      </Card>
    );
  }
  const { totals, departments, projects, upcoming, overloaded } = overview.data;
  return (
    <>
      <ExecutiveStatCards totals={totals} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <OverviewSection title="Công việc theo phòng ban">
            <DepartmentTaskChart departments={departments} />
          </OverviewSection>
        </div>
        <OverviewSection
          title="Quá tải / quá hạn"
          link={{ to: '/app/workload', label: 'Khối lượng việc' }}
        >
          <OverloadedList employees={overloaded} />
        </OverviewSection>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <OverviewSection title="Tiến độ dự án" link={{ to: '/app/projects', label: 'Xem tất cả' }}>
          <ProjectProgressList projects={projects} />
        </OverviewSection>
        <OverviewSection title="Hạn chót 7 ngày tới">
          <UpcomingTaskList tasks={upcoming} />
        </OverviewSection>
      </div>
    </>
  );
}
