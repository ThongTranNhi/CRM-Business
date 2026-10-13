import type { Env } from '../../config/env';
import { supabaseRequest } from '../../lib/supabase';
import type { TaskStatus } from './tasks.types';

export interface TaskTitleMatch {
  id: string;
  title: string;
  status: TaskStatus;
  boardId: string;
}

/**
 * Ô tìm kiếm ở Header: task chưa lưu trữ (view task_cards) trên các board cho trước, tên chứa `q` (đã escape
 * bởi searchSchema). Việc đang mở trước, rồi theo hạn.
 */
export async function searchTaskTitles(
  env: Env,
  boardIds: string[],
  q: string,
  limit: number,
): Promise<TaskTitleMatch[]> {
  if (boardIds.length === 0) return [];
  const params = new URLSearchParams({
    select: 'id,title,status,board_id',
    board_id: `in.(${boardIds.join(',')})`,
    title: `ilike.*${q}*`,
    order: 'status.desc,due_date.asc.nullslast,id',
    limit: String(limit),
  });
  const rows = await supabaseRequest<
    { id: string; title: string; status: TaskStatus; board_id: string }[]
  >(env, `/rest/v1/task_cards?${params}`);
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    boardId: row.board_id,
  }));
}
