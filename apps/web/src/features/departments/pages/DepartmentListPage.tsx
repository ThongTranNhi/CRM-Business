import { useState } from 'react';
import { Button, Icon, PageHeader, SearchInput, Tabs } from '@/components/ui';
import { useCan } from '@/features/auth';
import { readOption, readPage, useUrlParams } from '@/lib/use-url-params';
import { DepartmentFormModal } from '../components/DepartmentFormModal';
import { DepartmentListContent } from '../components/DepartmentListContent';
import { DEPARTMENT_STATUSES, type DepartmentStatus } from '../types';

const STATUS_TABS = [
  { value: 'active' as const, label: 'Đang hoạt động' },
  { value: 'deleted' as const, label: 'Đã xoá' },
];

export function DepartmentListPage() {
  const canDo = useCan();
  const [params, updateParams] = useUrlParams();
  const [creating, setCreating] = useState(false);
  const canSeeDeleted = canDo('departments.delete');
  const status = canSeeDeleted ? readOption(params, 'status', DEPARTMENT_STATUSES) : 'active';
  const listParams = { status, q: params.get('q') ?? '', page: readPage(params) };

  return (
    <>
      <PageHeader
        title="Phòng ban"
        description="Cơ cấu tổ chức, trưởng phòng và số nhân viên của từng phòng."
        actions={
          canDo('departments.manage') && (
            <Button onClick={() => setCreating(true)}>
              <Icon name="plus" size={18} />
              Tạo phòng ban
            </Button>
          )
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        {canSeeDeleted && (
          <Tabs
            label="Lọc phòng ban"
            items={STATUS_TABS}
            value={status}
            onChange={(next: DepartmentStatus) => updateParams({ status: next, page: null })}
          />
        )}
        <div className="sm:ml-auto sm:w-72">
          <SearchInput
            label="Tìm phòng ban"
            placeholder="Tìm theo tên phòng ban"
            value={listParams.q}
            onSearch={(q) => updateParams({ q, page: null })}
          />
        </div>
      </div>
      <DepartmentListContent
        params={listParams}
        onPageChange={(page) => updateParams({ page })}
        onCreate={canDo('departments.manage') ? () => setCreating(true) : undefined}
      />
      <DepartmentFormModal open={creating} onClose={() => setCreating(false)} />
    </>
  );
}
