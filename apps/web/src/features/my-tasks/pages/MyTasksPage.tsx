import { PageHeader, Tabs } from '@/components/ui';
import { useUrlParams } from '@/lib/use-url-params';
import { MyTaskFilters } from '../components/MyTaskFilters';
import { MyTasksContent } from '../components/MyTasksContent';
import { useMyTasks } from '../hooks/useMyTasks';
import { hasFilters, readMyTaskParams, tabLabel } from '../my-tasks.utils';
import { MY_TASK_TABS } from '../types';

/** /app/my-tasks — việc mình phụ trách + phối hợp (Đợt 3 S2); tab và bộ lọc trên URL. */
export function MyTasksPage() {
  const [urlParams, updateParams] = useUrlParams();
  const params = readMyTaskParams(urlParams);
  const query = useMyTasks(params);
  const counts = query.data?.meta.counts;

  return (
    <>
      <PageHeader
        title="Việc của tôi"
        description="Việc bạn phụ trách chính hoặc phối hợp trên các Dashboard."
      />
      <MyTaskFilters
        params={params}
        onChange={(changes) => updateParams({ ...changes, page: null })}
      />
      <div className="mb-4 overflow-x-auto">
        <Tabs
          label="Nhóm việc"
          items={MY_TASK_TABS.map((tab) => ({ value: tab, label: tabLabel(tab, counts) }))}
          value={params.tab}
          onChange={(tab) => updateParams({ tab, page: null })}
        />
      </div>
      <MyTasksContent
        query={query}
        tab={params.tab}
        isFiltering={hasFilters(params)}
        onPageChange={(page) => updateParams({ page })}
        onClearFilters={() =>
          updateParams({ department: null, priority: null, project: null, q: null, page: null })
        }
      />
    </>
  );
}
