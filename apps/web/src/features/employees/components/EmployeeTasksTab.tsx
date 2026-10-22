import { Link } from 'react-router-dom';
import { Card, EmptyState, ErrorState, Pagination, Skeleton, Tabs } from '@/components/ui';
import { MyTaskRow, useCompleteTask } from '@/features/my-tasks/task-row';
import { todayInVietnam } from '@/lib/format-date';
import { useEmployeeTasks } from '../hooks/useEmployeeTasks';
import type { EmployeeTaskTab } from '../types';

const TAB_LABELS: Record<EmployeeTaskTab, string> = {
  open: 'Đang mở',
  overdue: 'Quá hạn',
  done: 'Đã xong',
};
const EMPTY_TITLES: Record<EmployeeTaskTab, string> = {
  open: 'Không có việc đang mở',
  overdue: 'Không có việc quá hạn',
  done: 'Chưa hoàn thành việc nào',
};

interface EmployeeTasksTabProps {
  employeeId: string;
  tab: EmployeeTaskTab;
  page: number;
  onChange: (changes: { taskTab?: EmployeeTaskTab; page?: number }) => void;
}

/**
 * Tab Công việc ở hồ sơ (frontend-spec 4.8): việc người này phụ trách / phối hợp, như Việc của tôi. Bấm dòng → task
 * trên board; tích ô → hoàn thành nhanh (Super Admin sửa được mọi việc).
 */
export function EmployeeTasksTab({ employeeId, tab, page, onChange }: EmployeeTasksTabProps) {
  const tasks = useEmployeeTasks(employeeId, tab, page);
  const complete = useCompleteTask();
  const counts = tasks.data?.meta.counts;
  const items = (Object.keys(TAB_LABELS) as EmployeeTaskTab[]).map((value) => ({
    value,
    label: counts ? `${TAB_LABELS[value]} (${counts[value]})` : TAB_LABELS[value],
  }));
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 px-4 pt-3">
        <div className="min-w-0 overflow-x-auto">
          <Tabs<EmployeeTaskTab>
            label="Nhóm công việc"
            items={items}
            value={tab}
            onChange={(taskTab) => onChange({ taskTab })}
          />
        </div>
        <Link
          to="/app/workload"
          className="pb-2 text-sm font-medium text-primary-700 hover:underline"
        >
          Xem khối lượng
        </Link>
      </div>
      {renderBody()}
    </Card>
  );

  function renderBody() {
    if (tasks.isPending) return <Skeleton className="m-4 h-40" />;
    if (tasks.isError) {
      return <ErrorState message={tasks.error.message} onRetry={() => void tasks.refetch()} />;
    }
    if (tasks.data.data.length === 0) {
      return <EmptyState icon="checkSquare" title={EMPTY_TITLES[tab]} />;
    }
    const { page: current, pageSize, total } = tasks.data.meta;
    const today = todayInVietnam();
    return (
      <>
        <ul className="divide-y divide-gray-100">
          {tasks.data.data.map((task) => (
            <MyTaskRow
              key={task.id}
              task={task}
              today={today}
              onComplete={(target) => complete.mutate(target)}
            />
          ))}
        </ul>
        <div className="px-4 pb-3">
          <Pagination
            page={current}
            pageSize={pageSize}
            total={total}
            onChange={(next) => onChange({ page: next })}
          />
        </div>
      </>
    );
  }
}
