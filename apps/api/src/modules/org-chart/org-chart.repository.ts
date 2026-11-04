import type { Env } from '../../config/env';
import { ROLES, type Role } from '../../config/constants';
import { supabaseRequest } from '../../lib/supabase';
import type { OrgEmployeeRecord } from './org-chart.types';

// Hai truy vấn cho cả sơ đồ (không N+1): phòng ban chưa xoá và nhân viên đang làm.

/** Phòng ban chưa xoá, theo tên (giới hạn như ô chọn phòng ban). */
export const listDepartments = (env: Env) =>
  supabaseRequest<{ id: string; name: string }[]>(
    env,
    '/rest/v1/active_departments?select=id,name&order=name,id&limit=200',
  );

interface EmployeeRow {
  id: string;
  full_name: string;
  job_title: string | null;
  role: string | null;
  department_id: string | null;
  department_manager_id: string | null;
  auth_user_id: string | null;
  avatar_path: string | null;
}

/** Role lạ / thiếu → nhân viên (giao diện không gắn nhãn đặc biệt). */
const toRole = (role: string | null): Role => ROLES.find((value) => value === role) ?? 'employee';

/** Nhân viên chưa xoá, trạng thái đang làm (tối đa 1000 — cùng giới hạn ô chọn người). */
export async function listEmployees(env: Env): Promise<OrgEmployeeRecord[]> {
  const params = new URLSearchParams({
    select:
      'id,full_name,job_title,role,department_id,department_manager_id,auth_user_id,avatar_path',
    employment_status: 'eq.active',
    order: 'full_name,id',
    limit: '1000',
  });
  const rows = await supabaseRequest<EmployeeRow[]>(env, `/rest/v1/active_employees?${params}`);
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    jobTitle: row.job_title,
    role: toRole(row.role),
    departmentId: row.department_id,
    isDepartmentManager: row.department_id !== null && row.department_manager_id === row.id,
    authUserId: row.auth_user_id,
    avatarPath: row.avatar_path,
  }));
}
