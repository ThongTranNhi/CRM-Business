import type { Role } from '../../config/constants';
import type { Env } from '../../config/env';
import { AppError } from '../../lib/app-error';
import { DIRECTORY_ERRORS } from '../../lib/directory-errors';
import { rangeParams, toPage, type Page } from '../../lib/pagination';
import { callRpc, supabaseList, supabaseRequest } from '../../lib/supabase';
import type {
  AdminEmployeeUpdate,
  DeleteEmployeeTarget,
  DirectoryEmployee,
  DirectoryQuery,
  EmployeeOption,
  Profile,
  ProfileUpdate,
} from './users.types';

const employeeCodeExists = () =>
  new AppError('EMPLOYEE_CODE_EXISTS', 'Mã nhân viên đã được sử dụng', 409);

interface EmployeeRow {
  id: string;
  full_name: string;
  employee_code: string | null;
  job_title: string | null;
  department_id: string | null;
  department_name: string | null;
  department_manager_id: string | null;
  department_manager_name: string | null;
  avatar_path: string | null;
  auth_user_id: string | null;
  username: string | null;
  role: string | null;
  account_status: string | null;
  archived_at?: string | null;
}
const EMPLOYEE_SELECT =
  'id,full_name,employee_code,job_title,department_id,department_name,department_manager_id,department_manager_name,avatar_path,auth_user_id,username,role,account_status';

// Trưởng phòng do CEO / Master quản lý trực tiếp: chưa có liên kết quản lý cá nhân cấp CEO.
function managerNameOf(row: EmployeeRow): string | null {
  if (!row.department_manager_id) return null;
  return row.department_manager_id === row.id ? 'CEO / Master' : row.department_manager_name;
}

function toProfile(row: EmployeeRow): Profile {
  return {
    id: row.id,
    fullName: row.full_name,
    employeeCode: row.employee_code,
    jobTitle: row.job_title,
    departmentName: row.department_name,
    managerName: managerNameOf(row),
    avatarPath: row.avatar_path,
    avatarUrl: null,
  };
}

function toDirectoryEmployee(row: EmployeeRow): DirectoryEmployee {
  return {
    ...toProfile(row),
    departmentId: row.department_id,
    username: row.username,
    role: row.role,
    status: row.account_status,
    archivedAt: row.archived_at ?? null,
    managedDepartment:
      row.department_id && row.department_manager_id === row.id
        ? { id: row.department_id, name: row.department_name ?? '' }
        : null,
  };
}

export async function findAccount(env: Env, userId: string) {
  const params = new URLSearchParams({
    select: 'id,status,role',
    auth_user_id: `eq.${userId}`,
    limit: '1',
  });
  const rows = await supabaseRequest<{ id: string; status: string; role: string }[]>(
    env,
    `/rest/v1/app_accounts?${params}`,
  );
  return rows[0] ?? null;
}

export async function findProfile(env: Env, userId: string): Promise<Profile | null> {
  const params = new URLSearchParams({
    select: EMPLOYEE_SELECT,
    auth_user_id: `eq.${userId}`,
    employment_status: 'eq.active',
    limit: '1',
  });
  const rows = await supabaseRequest<EmployeeRow[]>(env, `/rest/v1/active_employees?${params}`);
  return rows[0] ? toProfile(rows[0]) : null;
}

export async function saveProfile(env: Env, userId: string, input: ProfileUpdate) {
  await callRpc(env, {
    name: 'update_own_profile',
    args: {
      target_auth_user_id: userId,
      new_employee_code: input.employeeCode,
      new_avatar_path: input.avatarPath ?? null,
      replace_avatar: input.avatarPath !== undefined,
    },
    errors: { '23505': employeeCodeExists },
  });
}

/** Người đang làm và đã khoá đọc từ active_employees; người đã xoá đọc từ employee_directory. */
const DIRECTORY_SOURCES = {
  active: {
    view: 'active_employees',
    filter: ['is_locked', 'is.false'],
    order: 'created_at.desc,id',
  },
  locked: {
    view: 'active_employees',
    filter: ['is_locked', 'is.true'],
    order: 'created_at.desc,id',
  },
  deleted: {
    view: 'employee_directory',
    filter: ['archived_at', 'not.is.null'],
    order: 'archived_at.desc,id',
  },
} as const;

// Giá trị đặt trong ngoặc kép để dấu chấm / khoảng trắng (vd. username "test.hr") không phá cú pháp `or`.
// Trong ngoặc kép PostgREST coi `\` là ký tự escape → nhân đôi để `\_`, `\%` của searchSchema tới được LIKE.
const searchFilter = (raw: string) => {
  const q = raw.replace(/\\/g, '\\\\');
  return `(full_name.ilike."*${q}*",employee_code.ilike."*${q}*",username.ilike."*${q}*")`;
};

export async function listDirectory(
  env: Env,
  query: DirectoryQuery,
): Promise<Page<DirectoryEmployee>> {
  const source = DIRECTORY_SOURCES[query.status];
  const params = new URLSearchParams({
    select: query.status === 'deleted' ? `${EMPLOYEE_SELECT},archived_at` : EMPLOYEE_SELECT,
    [source.filter[0]]: source.filter[1],
    order: source.order,
    ...rangeParams(query),
  });
  if (query.q) params.set('or', searchFilter(query.q));
  const { rows, total } = await supabaseList<EmployeeRow>(env, `/rest/v1/${source.view}?${params}`);
  return toPage(rows.map(toDirectoryEmployee), total, query);
}

/** Gồm cả người đã xoá để trang hồ sơ có nút [Khôi phục]. */
export async function directoryEmployee(env: Env, employeeId: string) {
  const params = new URLSearchParams({
    select: `${EMPLOYEE_SELECT},archived_at`,
    id: `eq.${employeeId}`,
    limit: '1',
  });
  const rows = await supabaseRequest<EmployeeRow[]>(env, `/rest/v1/employee_directory?${params}`);
  const row = rows[0];
  if (!row) return null;
  return { employee: toDirectoryEmployee(row), authUserId: row.auth_user_id };
}

export async function listEmployeeOptions(
  env: Env,
  { q, departmentId }: { q?: string | undefined; departmentId?: string | undefined },
) {
  const params = new URLSearchParams({
    select: 'id,full_name,job_title,department_id,department_name,role',
    order: 'full_name,id',
    limit: '20',
  });
  if (q) params.set('or', searchFilter(q));
  if (departmentId) params.set('department_id', `eq.${departmentId}`);
  const rows = await supabaseRequest<
    {
      id: string;
      full_name: string;
      job_title: string | null;
      department_id: string | null;
      department_name: string | null;
      role: Role | null;
    }[]
  >(env, `/rest/v1/active_employees?${params}`);
  return rows.map((row): EmployeeOption => ({
    id: row.id,
    fullName: row.full_name,
    jobTitle: row.job_title,
    departmentId: row.department_id,
    departmentName: row.department_name,
    role: row.role,
  }));
}

export const listDepartmentOptions = (env: Env) =>
  supabaseRequest<{ id: string; name: string }[]>(
    env,
    '/rest/v1/active_departments?select=id,name&order=name&limit=100',
  );

export const editEmployee = (
  env: Env,
  actorId: string,
  change: { employeeId: string } & AdminEmployeeUpdate,
) =>
  callRpc(env, {
    name: 'crm_admin_update_employee',
    args: {
      actor_uuid: actorId,
      employee_uuid: change.employeeId,
      employee_name: change.fullName,
      employee_job_title: change.jobTitle,
      employee_department_id: change.departmentId,
      account_status: change.status,
    },
    errors: DIRECTORY_ERRORS,
  });

/** Trả số việc đang mở (Dashboard còn ghi được) và số việc đã bàn giao (migration 20261008090000). */
export const deleteEmployee = (env: Env, actorId: string, target: DeleteEmployeeTarget) =>
  callRpc<{ openTaskCount: number; handedOverTaskCount: number }>(env, {
    name: 'crm_delete_employee',
    args: {
      actor_uuid: actorId,
      employee_uuid: target.employeeId,
      new_manager_uuid: target.newManagerId,
      handover_employee_uuid: target.handoverEmployeeId,
    },
    errors: DIRECTORY_ERRORS,
  });

export const restoreEmployee = (env: Env, actorId: string, employeeId: string) =>
  callRpc(env, {
    name: 'crm_restore_employee',
    args: { actor_uuid: actorId, employee_uuid: employeeId },
    errors: DIRECTORY_ERRORS,
  });

export const beginPasswordReset = (env: Env, actorId: string, employeeId: string) =>
  callRpc<string>(env, {
    name: 'crm_begin_password_reset',
    args: { actor_uuid: actorId, employee_uuid: employeeId },
  });
