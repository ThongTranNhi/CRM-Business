import { PageHeader, Select } from '@/components/ui';
import { useCan } from '@/features/auth';
import { useDepartmentOptions } from '@/features/departments';
import { useUrlParams } from '@/lib/use-url-params';
import { WorkloadContent } from '../components/WorkloadContent';
import { useWorkload } from '../hooks/useWorkload';
import { nextSort, readWorkloadParams } from '../workload.utils';

/**
 * /app/workload — Khối lượng việc (Đợt 4 S1, frontend-spec 4.6). Super Admin chọn phòng ban; Trưởng phòng /
 * Trưởng nhóm luôn chỉ thấy phòng mình (API giới hạn) nên không có ô chọn.
 */
export function WorkloadPage() {
  const canDo = useCan();
  const canViewAll = canDo('workload.view-all');
  const [urlParams, updateParams] = useUrlParams();
  const fromUrl = readWorkloadParams(urlParams);
  // Link `?department=` mở bởi người chỉ xem được phòng mình → bỏ, thay vì để API trả 403.
  const params = canViewAll ? fromUrl : { ...fromUrl, departmentId: '' };
  const query = useWorkload(params);

  return (
    <>
      <PageHeader
        title="Khối lượng việc"
        description="Số việc mỗi người đang phụ trách chính trên các Dashboard. Quá hạn tô đỏ, hơn 10 việc đang mở tô cam."
      />
      {canViewAll && (
        <DepartmentFilter departmentId={params.departmentId} onChange={updateParams} />
      )}
      <WorkloadContent
        query={query}
        params={params}
        canOpenProfile={canDo('employees.view')}
        onSort={(sort) => updateParams({ ...nextSort(params, sort), page: null })}
        onPageChange={(page) => updateParams({ page })}
        onClearFilters={() => updateParams({ department: null, page: null })}
      />
    </>
  );
}

interface DepartmentFilterProps {
  departmentId: string;
  onChange: (changes: { department: string; page: null }) => void;
}

function DepartmentFilter({ departmentId, onChange }: DepartmentFilterProps) {
  const departments = useDepartmentOptions();
  return (
    <div className="mb-4 w-full sm:w-64">
      <Select
        label="Lọc theo phòng ban"
        hideLabel
        placeholder="Mọi phòng ban"
        options={(departments.data ?? []).map((department) => ({
          value: department.id,
          label: department.name,
        }))}
        value={departmentId}
        onChange={(event) => onChange({ department: event.target.value, page: null })}
      />
    </div>
  );
}
