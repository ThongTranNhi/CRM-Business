import { ButtonLink, Card, ErrorState, PageHeader, Skeleton } from '@/components/ui';
import { useCurrentUser } from '@/features/auth';
import { RecentNotifications } from '@/features/notifications/recent';
import { formatLongDate } from '@/lib/format-date';
import { CompanyToday } from '../components/CompanyToday';
import { DueSoonList } from '../components/DueSoonList';
import { TaskStatCards } from '../components/TaskStatCards';
import { usePersonalOverview } from '../hooks/usePersonalOverview';

/**
 * /app — Tổng quan cá nhân (Đợt 4 S2, frontend-spec 4.2): lời chào, 4 thẻ việc, việc sắp đến hạn, thông báo mới,
 * khối toàn công ty (Super Admin). Chấm công, Tạo đơn nghỉ, Chờ tôi duyệt, Đơn của tôi thêm ở Đợt 5.
 */
export function PersonalOverviewPage() {
  const { data: user } = useCurrentUser();
  const name = user?.fullName ?? user?.username ?? '';
  return (
    <div className="space-y-6">
      <PageHeader
        title="Tổng quan"
        description={`Xin chào${name ? `, ${name}` : ''} — ${formatLongDate(new Date())}`}
        actions={<ButtonLink to="/app/workspace">Vào Workspace</ButtonLink>}
      />
      <OverviewTasks />
    </div>
  );
}

function OverviewTasks() {
  const overview = usePersonalOverview();
  if (overview.isPending) {
    return (
      <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {['todo', 'doing', 'late', 'done'].map((key) => (
            <Skeleton key={key} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
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
  const { counts, dueSoon, company } = overview.data;
  return (
    <>
      <TaskStatCards counts={counts} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <DueSoonList tasks={dueSoon} />
        </div>
        <RecentNotifications />
      </div>
      {company && <CompanyToday company={company} />}
    </>
  );
}
