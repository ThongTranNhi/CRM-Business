import { Link } from 'react-router-dom';
import { ButtonLink, Card, EmptyState } from '@/components/ui';
import { MyTaskRow, useCompleteTask, type MyTask } from '@/features/my-tasks/task-row';
import { todayInVietnam } from '@/lib/format-date';

interface DueSoonListProps {
  tasks: MyTask[];
}

/** "Việc sắp đến hạn" (7 ngày, tối đa 8 dòng): bấm dòng → task trên board; tích ô → hoàn thành nhanh. */
export function DueSoonList({ tasks }: DueSoonListProps) {
  const complete = useCompleteTask();
  // Ẩn ngay dòng vừa tích (đang chờ server) để không bấm hoàn thành hai lần; dữ liệu mới về sẽ bỏ hẳn dòng đó.
  const completingId = complete.isPending ? complete.variables.id : null;
  const visible = tasks.filter((task) => task.id !== completingId);
  const today = todayInVietnam();
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Việc sắp đến hạn</h2>
        <Link to="/app/my-tasks" className="text-sm font-medium text-primary-700 hover:underline">
          Xem tất cả
        </Link>
      </div>
      {visible.length === 0 ? (
        <EmptyState
          icon="checkSquare"
          title="Không có việc đến hạn trong 7 ngày tới"
          action={
            <ButtonLink variant="secondary" to="/app/workspace">
              Vào Workspace
            </ButtonLink>
          }
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {visible.map((task) => (
            <MyTaskRow
              key={task.id}
              task={task}
              today={today}
              onComplete={(target) => complete.mutate(target)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
