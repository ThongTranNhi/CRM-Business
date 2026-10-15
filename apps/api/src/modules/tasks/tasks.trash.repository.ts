import type { Env } from '../../config/env';
import { rangeParams, toPage, type Page } from '../../lib/pagination';
import { supabaseList } from '../../lib/supabase';
import type { TrashQuery, TrashTask } from './tasks.types';

interface TrashRow {
  id: string;
  title: string;
  archived_at: string;
  column_name: string;
  assignee_id: string;
  assignee_name: string;
  archived_by_id: string | null;
  archived_by_name: string | null;
}
const TRASH_SELECT =
  'id,title,archived_at,column_name,assignee_id,assignee_name,archived_by_id,archived_by_name';

const mapTrashTask = (row: TrashRow): TrashTask => ({
  id: row.id,
  title: row.title,
  columnName: row.column_name,
  archivedAt: row.archived_at,
  assignee: { id: row.assignee_id, fullName: row.assignee_name },
  archivedBy:
    row.archived_by_id && row.archived_by_name
      ? { id: row.archived_by_id, fullName: row.archived_by_name }
      : null,
});

interface TrashFilter extends TrashQuery {
  boardId: string;
  /** app_accounts.id: chỉ việc người này tạo (TrashScope `own`); null = mọi việc. */
  createdBy: string | null;
}

/** Thùng rác một board (view task_trash, migration 20261007100000), mới xoá trước. */
export async function listTrash(
  env: Env,
  { boardId, createdBy, q, page, pageSize }: TrashFilter,
): Promise<Page<TrashTask>> {
  const params = new URLSearchParams({
    select: TRASH_SELECT,
    board_id: `eq.${boardId}`,
    order: 'archived_at.desc,id',
    ...rangeParams({ page, pageSize }),
  });
  if (createdBy) params.set('created_by', `eq.${createdBy}`);
  if (q) params.set('title', `ilike.*${q}*`);
  const { rows, total } = await supabaseList<TrashRow>(env, `/rest/v1/task_trash?${params}`);
  return toPage(rows.map(mapTrashTask), total, { page, pageSize });
}
