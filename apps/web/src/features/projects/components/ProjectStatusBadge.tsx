import { Badge } from '@/components/ui';
import { PROJECT_STATUS_META } from '../project.utils';
import type { ProjectSummary } from '../types';

interface ProjectStatusBadgeProps {
  project: Pick<ProjectSummary, 'status' | 'archivedAt'>;
}

/** Trạng thái dự án; đã lưu trữ thì hiện "Đã lưu trữ" thay trạng thái. */
export function ProjectStatusBadge({ project }: ProjectStatusBadgeProps) {
  if (project.archivedAt) return <Badge tone="neutral">Đã lưu trữ</Badge>;
  const meta = PROJECT_STATUS_META[project.status];
  return <Badge tone={meta.tone}>{meta.label}</Badge>;
}
