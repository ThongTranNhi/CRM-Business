import type { Env } from '../config/env';
import { supabaseRequest } from './supabase';

/**
 * Tên nhân viên theo id (gồm người đã nghỉ) — lịch sử chỉ lưu id, tên lấy khi đọc (activity-log.md).
 * Dùng chung cho lịch sử task và lịch sử dự án.
 */
export async function findEmployeeNames(env: Env, employeeIds: string[]) {
  if (employeeIds.length === 0) return new Map<string, string>();
  const params = new URLSearchParams({
    select: 'id,full_name',
    id: `in.(${employeeIds.join(',')})`,
  });
  const rows = await supabaseRequest<{ id: string; full_name: string }[]>(
    env,
    `/rest/v1/employees?${params}`,
  );
  return new Map(rows.map((row) => [row.id, row.full_name]));
}
