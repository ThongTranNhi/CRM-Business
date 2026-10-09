import type { Env } from '../../config/env';
import { supabaseRequest } from '../../lib/supabase';
import type { AvatarOwner } from '../users/users.types';

/** Một người kèm thông tin ảnh đại diện (ký URL ở service). */
export interface PersonRow extends AvatarOwner {
  fullName: string;
  jobTitle: string | null;
  isArchived: boolean;
}

interface EmployeeRow {
  id: string;
  full_name: string;
  job_title: string | null;
  avatar_path: string | null;
  auth_user_id: string | null;
  archived_at?: string | null;
}

const mapPerson = (row: EmployeeRow): PersonRow => ({
  id: row.id,
  fullName: row.full_name,
  jobTitle: row.job_title,
  avatarPath: row.avatar_path,
  authUserId: row.auth_user_id,
  isArchived: Boolean(row.archived_at),
});

async function selectIds(env: Env, path: string, column: string): Promise<string[]> {
  const rows = await supabaseRequest<Record<string, string | null>[]>(env, path);
  return rows.flatMap((row) => (row[column] ? [row[column]] : []));
}

/**
 * Q6: người chọn được làm chủ / thành viên dự án — nhân viên đang làm của phòng + người được mời vào board
 * của Dashboard phòng đó (cùng điều kiện với RPC crm_assert_project_participant).
 */
export async function listEligible(env: Env, departmentId: string): Promise<PersonRow[]> {
  const [boardId] = await selectIds(
    env,
    `/rest/v1/dashboard_summaries?select=board_id&department_id=eq.${departmentId}&limit=1`,
    'board_id',
  );
  const invitedIds = boardId
    ? await selectIds(
        env,
        `/rest/v1/board_members?select=employee_id&board_id=eq.${boardId}`,
        'employee_id',
      )
    : [];
  const conditions = [`department_id.eq.${departmentId}`];
  if (invitedIds.length > 0) conditions.push(`id.in.(${invitedIds.join(',')})`);
  const params = new URLSearchParams({
    select: 'id,full_name,job_title,avatar_path,auth_user_id',
    or: `(${conditions.join(',')})`,
    order: 'full_name,id',
  });
  const rows = await supabaseRequest<EmployeeRow[]>(env, `/rest/v1/active_employees?${params}`);
  return rows.map(mapPerson);
}

/** Thành viên hiện tại (kể cả người đã nghỉ — vẫn hiện, vẫn gỡ được). */
export async function listPeople(env: Env, employeeIds: string[]): Promise<PersonRow[]> {
  if (employeeIds.length === 0) return [];
  const params = new URLSearchParams({
    select: 'id,full_name,job_title,avatar_path,auth_user_id,archived_at',
    id: `in.(${employeeIds.join(',')})`,
    order: 'full_name,id',
  });
  const rows = await supabaseRequest<EmployeeRow[]>(env, `/rest/v1/employee_directory?${params}`);
  return rows.map(mapPerson);
}
