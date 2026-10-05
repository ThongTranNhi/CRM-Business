import {
  ButtonLink,
  Card,
  EmptyState,
  ErrorState,
  Icon,
  PageHeader,
  Pagination,
  SearchInput,
  Skeleton,
  Tabs,
} from '@/components/ui';
import { readOption, readPage, useUrlParams } from '@/lib/use-url-params';
import { EmployeeTable } from '../components/EmployeeTable';
import { useDirectory } from '../hooks/useDirectory';
import { EMPLOYEE_STATUSES, type DirectoryParams, type EmployeeStatusFilter } from '../types';

const STATUS_TABS = [
  { value: 'active' as const, label: 'Đang làm' },
  { value: 'locked' as const, label: 'Đã khoá' },
  { value: 'deleted' as const, label: 'Đã xoá' },
];

export function EmployeeDirectoryPage() {
  const [params, updateParams] = useUrlParams();
  const directoryParams: DirectoryParams = {
    status: readOption(params, 'status', EMPLOYEE_STATUSES),
    q: params.get('q') ?? '',
    page: readPage(params),
  };

  return (
    <>
      <PageHeader
        title="Nhân viên"
        description="Hồ sơ, phòng ban và trạng thái tài khoản của toàn công ty."
        actions={
          <ButtonLink to="/app/onboarding?new=1">
            <Icon name="plus" size={18} />
            Thêm nhân viên
          </ButtonLink>
        }
      />
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <Tabs
          label="Lọc nhân viên theo trạng thái"
          items={STATUS_TABS}
          value={directoryParams.status}
          onChange={(status: EmployeeStatusFilter) => updateParams({ status, page: null })}
        />
        <div className="sm:w-80">
          <SearchInput
            label="Tìm nhân viên"
            placeholder="Tìm theo tên, mã nhân viên, username"
            value={directoryParams.q}
            onSearch={(q) => updateParams({ q, page: null })}
          />
        </div>
      </div>
      <DirectoryContent params={directoryParams} onPageChange={(page) => updateParams({ page })} />
    </>
  );
}

interface DirectoryContentProps {
  params: DirectoryParams;
  onPageChange: (page: number) => void;
}

function DirectoryContent({ params, onPageChange }: DirectoryContentProps) {
  const { data, isPending, isError, error, refetch } = useDirectory(params);

  if (isPending) return <Skeleton className="h-64 w-full" />;
  if (isError) return <ErrorState message={error.message} onRetry={() => void refetch()} />;
  if (data.data.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={params.q ? 'search' : 'users'}
          title={params.q ? 'Không tìm thấy nhân viên phù hợp' : 'Không có nhân viên trong mục này'}
        />
      </Card>
    );
  }
  return (
    <>
      <EmployeeTable employees={data.data} />
      <Pagination {...data.meta} onChange={onPageChange} />
    </>
  );
}
