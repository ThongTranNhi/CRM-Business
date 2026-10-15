import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Icon, PageHeader, SearchInput, Select } from '@/components/ui';
import { useCan } from '@/features/auth';
import { readPage, useUrlParams } from '@/lib/use-url-params';
import { ProjectFormModal } from '../components/ProjectFormModal';
import { ProjectListContent } from '../components/ProjectListContent';
import { PROJECT_STATUS_META, PROJECT_STATUSES } from '../project.utils';
import type { ProjectStatusFilter } from '../types';

const STATUS_FILTERS: { value: ProjectStatusFilter; label: string }[] = [
  ...PROJECT_STATUSES.map((status) => ({
    value: status,
    label: PROJECT_STATUS_META[status].label,
  })),
  { value: 'archived', label: 'Đã lưu trữ' },
];

const readStatus = (value: string | null) =>
  STATUS_FILTERS.find((filter) => filter.value === value)?.value ?? null;

/** /app/projects — dự án theo quyền (BR-30), lọc trạng thái + tìm tên trên URL. */
export function ProjectListPage() {
  const canDo = useCan();
  const navigate = useNavigate();
  const [params, updateParams] = useUrlParams();
  const [creating, setCreating] = useState(false);
  const listParams = {
    status: readStatus(params.get('status')),
    q: params.get('q') ?? '',
    page: readPage(params),
  };
  const canCreate = canDo('projects.create');

  return (
    <>
      <PageHeader
        title="Dự án"
        description="Dự án của các phòng ban; tiến độ tính từ công việc thật."
        actions={
          canCreate && (
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} />
              Tạo dự án
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="sm:w-72">
          <SearchInput
            label="Tìm dự án"
            placeholder="Tìm theo tên dự án"
            value={listParams.q}
            onSearch={(q) => updateParams({ q, page: null })}
          />
        </div>
        <div className="sm:w-52">
          <Select
            label="Lọc theo trạng thái"
            hideLabel
            placeholder="Mọi dự án đang có"
            options={STATUS_FILTERS}
            value={listParams.status ?? ''}
            onChange={(event) => updateParams({ status: event.target.value || null, page: null })}
          />
        </div>
      </div>
      <ProjectListContent
        params={listParams}
        onPageChange={(page) => updateParams({ page })}
        onClearFilters={() => updateParams({ q: null, status: null, page: null })}
        onCreate={canCreate ? () => setCreating(true) : undefined}
      />
      <ProjectFormModal
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(project) => navigate(`/app/projects/${project.id}`)}
      />
    </>
  );
}
