import type { Env } from '../../config/env';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import { workAccessSchema, type WorkAccess } from '../../lib/work-access';
import type { BoardColumn, TaskCard, TaskPriority, TaskStatus } from './tasks.types';

/** Dữ kiện quyền của người gọi với một board hoặc một task (RPC crm_work_access). */
export async function findWorkAccess(
  env: Env,
  userId: string,
  target: { boardId?: string; taskId?: string },
): Promise<WorkAccess | null> {
  const result = await callRpc<unknown>(env, {
    name: 'crm_work_access',
    args: {
      user_uuid: userId,
      board_uuid: target.boardId ?? null,
      task_uuid: target.taskId ?? null,
    },
  });
  return workAccessSchema.nullable().parse(result);
}

export async function listColumns(env: Env, boardId: string): Promise<BoardColumn[]> {
  const params = new URLSearchParams({
    select: 'id,name,status,position',
    board_id: `eq.${boardId}`,
    order: 'position',
  });
  return supabaseRequest<BoardColumn[]>(env, `/rest/v1/board_columns?${params}`);
}

interface CardRow {
  id: string;
  column_id: string;
  status: TaskStatus;
  title: string;
  position: number;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  assignee_id: string;
  assignee_name: string;
  assignee_archived: boolean;
  collaborators: { id: string; name: string }[];
  checklist_total: number;
  checklist_done: number;
  comment_count: number;
  created_by: string;
}
const CARD_SELECT =
  'id,column_id,status,title,position,priority,due_date,completed_at,assignee_id,assignee_name,' +
  'assignee_archived,collaborators,checklist_total,checklist_done,comment_count,created_by';

const mapCard = (row: CardRow): TaskCard => ({
  id: row.id,
  columnId: row.column_id,
  status: row.status,
  title: row.title,
  position: Number(row.position),
  priority: row.priority,
  dueDate: row.due_date,
  completedAt: row.completed_at,
  assignee: { id: row.assignee_id, fullName: row.assignee_name, isArchived: row.assignee_archived },
  collaborators: row.collaborators.map((person) => ({ id: person.id, fullName: person.name })),
  checklist: { done: row.checklist_done, total: row.checklist_total },
  commentCount: row.comment_count,
  createdById: row.created_by,
});

const cardsPath = (filter: Record<string, string>) =>
  `/rest/v1/task_cards?${new URLSearchParams({ select: CARD_SELECT, ...filter })}`;

/** Việc chưa xong của board (Việc cần làm, Việc đang làm). */
export async function listOpenCards(env: Env, boardId: string): Promise<TaskCard[]> {
  const rows = await supabaseRequest<CardRow[]>(
    env,
    cardsPath({ board_id: `eq.${boardId}`, status: 'in.(todo,in_progress)', order: 'position,id' }),
  );
  return rows.map(mapCard);
}

/** `limit` việc Đã hoàn thành gần nhất + tổng số (department-dashboard.md: N việc + [Xem thêm]). */
export async function listDoneCards(env: Env, boardId: string, limit: number) {
  const { rows, total } = await supabaseList<CardRow>(
    env,
    cardsPath({
      board_id: `eq.${boardId}`,
      status: 'eq.done',
      order: 'completed_at.desc,id',
      limit: String(limit),
    }),
  );
  return { cards: rows.map(mapCard), total };
}

export async function findCard(env: Env, taskId: string): Promise<TaskCard | null> {
  const rows = await supabaseRequest<CardRow[]>(env, cardsPath({ id: `eq.${taskId}`, limit: '1' }));
  return rows[0] ? mapCard(rows[0]) : null;
}
