import { useState } from 'react';
import { Button, Icon, PageHeader, SearchInput } from '@/components/ui';
import { useUrlParams } from '@/lib/use-url-params';
import { CreateDashboardModal } from '../components/CreateDashboardModal';
import { DashboardGrid } from '../components/DashboardGrid';
import { MissingDashboardsNote } from '../components/MissingDashboardsNote';
import { useCanCreateDashboard } from '../hooks/useCanCreateDashboard';

/** /app/workspace — Dashboard đã tạo (BR-03). `?q=` tìm kiếm, `?createFor=` mở sẵn modal Tạo Dashboard. */
export function WorkspacePage() {
  const [params, updateParams] = useUrlParams();
  const canCreate = useCanCreateDashboard();
  const [isCreating, setCreating] = useState(false);
  const query = params.get('q') ?? '';
  const createFor = params.get('createFor');

  const openCreate = (departmentId?: string) =>
    departmentId ? updateParams({ createFor: departmentId }) : setCreating(true);
  const closeCreate = () => {
    setCreating(false);
    updateParams({ createFor: null });
  };

  return (
    <>
      <PageHeader
        title="Workspace"
        description="Dashboard công việc của các phòng ban."
        actions={
          canCreate && (
            <Button onClick={() => openCreate()}>
              <Icon name="plus" size={18} />
              Tạo Dashboard
            </Button>
          )
        }
      />
      <div className="mb-5 max-w-md">
        <SearchInput
          value={query}
          onSearch={(value) => updateParams({ q: value })}
          label="Tìm Dashboard"
          placeholder="Tìm theo tên Dashboard hoặc phòng ban"
        />
      </div>
      <DashboardGrid
        query={query}
        canCreate={canCreate}
        onCreate={() => openCreate()}
        onClearSearch={() => updateParams({ q: null })}
      />
      <MissingDashboardsNote onCreate={openCreate} />
      <CreateDashboardModal
        open={canCreate && (isCreating || createFor !== null)}
        initialDepartmentId={createFor}
        onClose={closeCreate}
      />
    </>
  );
}
