import { Link } from 'react-router-dom';
import { Table, type TableColumn } from '@/components/ui';
import type { WorkloadParams, WorkloadRow, WorkloadSort } from '../types';
import {
  boardLink,
  isOverloaded,
  isWorkloadSort,
  overdueTone,
  type CountFilter,
} from '../workload.utils';
import { CountCell, OpenLoadBar } from './WorkloadCells';

interface WorkloadTableProps {
  rows: WorkloadRow[];
  sort: Pick<WorkloadParams, 'sort' | 'order'>;
  onSort: (sort: WorkloadSort) => void;
  /** Có quyền xem hồ sơ → tên là link; không → chỉ chữ (frontend-spec mục 6). */
  canOpenProfile: boolean;
}

type CountKey = Extract<WorkloadSort, keyof WorkloadRow>;

const COUNT_COLUMNS: { key: Exclude<CountKey, 'open'>; header: string; filter: CountFilter }[] = [
  { key: 'todo', header: 'Cần làm', filter: 'todo' },
  { key: 'inProgress', header: 'Đang làm', filter: 'in_progress' },
  { key: 'overdue', header: 'Quá hạn', filter: 'overdue' },
  { key: 'done30d', header: 'Xong (30 ngày)', filter: 'done' },
];

function countColumn({ key, header, filter }: (typeof COUNT_COLUMNS)[number]) {
  return {
    key,
    header,
    sortable: true,
    className: 'text-right',
    render: (row: WorkloadRow) => (
      <CountCell
        value={row[key]}
        href={boardLink(row, filter)}
        tone={key === 'overdue' ? overdueTone(row) : null}
        label={`${header} của ${row.employee.fullName}`}
      />
    ),
  } satisfies TableColumn<WorkloadRow>;
}

/** Bảng nhân viên · phòng ban · số việc theo nhóm · thanh tổng việc đang mở (frontend-spec 4.6). */
export function WorkloadTable({ rows, sort, onSort, canOpenProfile }: WorkloadTableProps) {
  const maxOpen = Math.max(0, ...rows.map((row) => row.open));
  const columns: TableColumn<WorkloadRow>[] = [
    {
      key: 'name',
      header: 'Nhân viên',
      sortable: true,
      render: (row) =>
        canOpenProfile ? (
          <Link
            to={`/app/employees/${row.employee.id}`}
            className="font-medium text-gray-900 hover:underline"
          >
            {row.employee.fullName}
          </Link>
        ) : (
          <span className="font-medium text-gray-900">{row.employee.fullName}</span>
        ),
    },
    {
      key: 'department',
      header: 'Phòng ban',
      render: (row) =>
        row.department ? (
          <Link to={`/app/departments/${row.department.id}`} className="hover:underline">
            {row.department.name}
          </Link>
        ) : (
          <span className="text-gray-400">Chưa có phòng</span>
        ),
    },
    ...COUNT_COLUMNS.map(countColumn),
    {
      key: 'open',
      header: 'Đang mở',
      sortable: true,
      render: (row) => (
        <OpenLoadBar open={row.open} max={maxOpen} isOverloaded={isOverloaded(row)} />
      ),
    },
  ];
  return (
    <Table
      caption="Khối lượng việc theo nhân viên"
      columns={columns}
      rows={rows}
      getRowKey={(row) => row.employee.id}
      sort={{ key: sort.sort, order: sort.order }}
      onSort={(key) => {
        if (isWorkloadSort(key)) onSort(key);
      }}
    />
  );
}
