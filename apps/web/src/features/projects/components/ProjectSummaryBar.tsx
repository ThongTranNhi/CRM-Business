import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { formatIsoDate } from '../project.utils';
import type { ProjectDetail } from '../types';
import { ProjectProgress } from './ProjectProgress';
import { ProjectStatusBadge } from './ProjectStatusBadge';

/** Đầu trang dự án: trạng thái, tiến độ (BR-31), hạn, chủ dự án, phòng ban; cảnh báo chỉ đọc. */
export function ProjectSummaryBar({ project }: { project: ProjectDetail }) {
  return (
    <>
      {project.departmentArchived && (
        <p
          role="status"
          className="mb-4 rounded-lg bg-warning-50 px-4 py-3 text-sm text-warning-800"
        >
          Phòng ban của dự án đã bị xoá — dự án chỉ xem được.
        </p>
      )}
      {project.archivedAt && !project.departmentArchived && (
        <p role="status" className="mb-4 rounded-lg bg-gray-100 px-4 py-3 text-sm text-gray-700">
          Dự án đã lưu trữ: ẩn khỏi danh sách và ô chọn dự án.
        </p>
      )}
      <Card>
        <dl className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <Item label="Trạng thái">
            <ProjectStatusBadge project={project} />
          </Item>
          <Item label="Tiến độ">
            <ProjectProgress progress={project.progress} />
          </Item>
          <Item label="Hạn">{formatIsoDate(project.dueDate)}</Item>
          <Item label="Chủ dự án">{project.owner?.fullName ?? 'Chưa chọn'}</Item>
          <Item label="Phòng ban">
            <Link
              to={`/app/departments/${project.department.id}`}
              className="text-primary-700 hover:underline"
            >
              {project.department.name}
            </Link>
          </Item>
        </dl>
      </Card>
    </>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="text-sm text-gray-900">{children}</dd>
    </div>
  );
}
