import { Card } from '@/components/ui';
import { formatDate } from '@/lib/format-date';
import { formatIsoDate } from '../project.utils';
import type { ProjectDetail } from '../types';

/** Tab Tổng quan: mô tả, số việc theo trạng thái (BR-31), mốc thời gian. */
export function ProjectOverviewTab({ project }: { project: ProjectDetail }) {
  const { total, done, overdue } = project.progress;
  const stats = [
    { label: 'Tổng công việc', value: total },
    { label: 'Đã xong', value: done },
    { label: 'Đang mở', value: total - done },
    { label: 'Quá hạn', value: overdue },
  ];
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <Card>
          <div className="space-y-2 p-4">
            <h2 className="text-base font-semibold text-gray-900">Mô tả</h2>
            <p className="whitespace-pre-wrap text-sm text-gray-700">
              {project.description || 'Chưa có mô tả.'}
            </p>
          </div>
        </Card>
      </div>
      <Card>
        <div className="space-y-3 p-4">
          <h2 className="text-base font-semibold text-gray-900">Số liệu</h2>
          <dl className="grid grid-cols-2 gap-3">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt className="text-xs text-gray-500">{stat.label}</dt>
                <dd className="text-xl font-semibold text-gray-900">{stat.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-sm text-gray-600">
            Bắt đầu {formatIsoDate(project.startDate)} · Hạn {formatIsoDate(project.dueDate)} · Tạo
            ngày {formatDate(new Date(project.createdAt))}
          </p>
        </div>
      </Card>
    </div>
  );
}
