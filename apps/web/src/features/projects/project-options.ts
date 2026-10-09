import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { getProject, listProjects } from './api/projects.api';
import { projectKeys } from './hooks/project-keys';

// Entry nhỏ cho module khác (ô lọc dự án, làm mới tiến độ dự án): KHÔNG import trang để route
// /app/projects vẫn được tải lười (index.ts chỉ dành cho router).

export { projectKeys };

/** Ô tìm dự án: tìm trên server theo tên (`?q=`), chỉ chạy khi đã gõ — không giới hạn ở 20 dự án đầu. */
export function useProjectOptions(q: string) {
  return useQuery({
    queryKey: projectKeys.list({ status: null, q, page: 1 }),
    queryFn: () => listProjects({ status: null, q, page: 1 }),
    enabled: q !== '',
    placeholderData: keepPreviousData,
  });
}

/** Tên dự án đang lọc (mở link có sẵn `?project=`). */
export function useProjectName(projectId: string) {
  const query = useQuery({
    queryKey: projectKeys.detail(projectId),
    queryFn: () => getProject(projectId),
    enabled: projectId !== '',
  });
  return query.data?.name;
}
