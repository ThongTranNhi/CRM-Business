import type { Env } from '../../config/env';
import { supabaseRequest } from '../../lib/supabase';
import type { AdminEmployeeUpdate, DirectoryEmployee, Profile, ProfileUpdate } from './users.types';

interface AccountRow {
  id: string;
  status: string;
  role: string;
}
interface ProfileRow {
  id: string;
  full_name: string;
  employee_code: string | null;
  job_title: string | null;
  avatar_path: string | null;
  departments: { name: string; manager_employee_id: string } | null;
}

export async function findAccount(env: Env, userId: string) {
  const params = new URLSearchParams({
    select: 'id,status,role',
    auth_user_id: `eq.${userId}`,
    limit: '1',
  });
  const rows = await supabaseRequest<AccountRow[]>(env, `/rest/v1/app_accounts?${params}`);
  return rows[0] ?? null;
}

export async function findProfile(env: Env, accountId: string): Promise<Profile | null> {
  const params = new URLSearchParams({
    select:
      'id,full_name,employee_code,job_title,avatar_path,departments!employees_department_id_fkey(name,manager_employee_id)',
    account_id: `eq.${accountId}`,
    archived_at: 'is.null',
    employment_status: 'eq.active',
    limit: '1',
  });
  const rows = await supabaseRequest<ProfileRow[]>(env, `/rest/v1/employees?${params}`);
  const row = rows[0];
  if (!row) return null;
  let managerName: string | null = null;
  if (row.departments) {
    if (row.departments.manager_employee_id === row.id) managerName = 'CEO / Master';
    else {
      const managerParams = new URLSearchParams({
        select: 'full_name',
        id: `eq.${row.departments.manager_employee_id}`,
        limit: '1',
      });
      const managers = await supabaseRequest<{ full_name: string }[]>(
        env,
        `/rest/v1/employees?${managerParams}`,
      );
      managerName = managers[0]?.full_name ?? null;
    }
  }
  return {
    id: row.id,
    fullName: row.full_name,
    employeeCode: row.employee_code,
    jobTitle: row.job_title,
    departmentName: row.departments?.name ?? null,
    managerName,
    avatarPath: row.avatar_path,
    avatarUrl: null,
  };
}

export async function saveProfile(env: Env, userId: string, input: ProfileUpdate) {
  await supabaseRequest(env, '/rest/v1/rpc/update_own_profile', {
    method: 'POST',
    body: JSON.stringify({
      target_auth_user_id: userId,
      new_employee_code: input.employeeCode,
      new_avatar_path: input.avatarPath ?? null,
      replace_avatar: input.avatarPath !== undefined,
    }),
  });
}

export async function signAvatar(env: Env, path: string): Promise<string> {
  const encoded = path.split('/').map(encodeURIComponent).join('/');
  const result = await supabaseRequest<{ signedURL: string }>(
    env,
    `/storage/v1/object/sign/profile-avatars/${encoded}`,
    {
      method: 'POST',
      body: JSON.stringify({ expiresIn: 300 }),
    },
  );
  return new URL(`/storage/v1${result.signedURL}`, env.SUPABASE_URL).toString();
}

interface DirectoryRow {
  id: string;
  full_name: string;
  employee_code: string | null;
  job_title: string | null;
  department_id: string | null;
  avatar_path: string | null;
  departments: { name: string; manager_employee_id: string } | null;
  app_accounts: {
    username: string | null;
    role: string;
    status: string;
    auth_user_id: string;
  } | null;
}
const DIRECTORY_SELECT =
  'id,full_name,employee_code,job_title,department_id,avatar_path,departments!employees_department_id_fkey(name,manager_employee_id),app_accounts!employees_account_id_fkey(username,role,status,auth_user_id)';
function mapEmployee(row: DirectoryRow): DirectoryEmployee {
  return {
    id: row.id,
    fullName: row.full_name,
    employeeCode: row.employee_code,
    jobTitle: row.job_title,
    departmentId: row.department_id,
    departmentName: row.departments?.name ?? null,
    managerName: null,
    username: row.app_accounts?.username ?? null,
    role: row.app_accounts?.role ?? null,
    status: row.app_accounts?.status ?? null,
    avatarPath: row.avatar_path,
    avatarUrl: null,
  };
}
export async function listDirectory(env: Env, page: number) {
  const params = new URLSearchParams({
    select: DIRECTORY_SELECT,
    archived_at: 'is.null',
    order: 'created_at.desc,id',
    limit: '26',
    offset: String((page - 1) * 25),
  });
  const rows = await supabaseRequest<DirectoryRow[]>(env, `/rest/v1/employees?${params}`);
  return {
    data: rows.slice(0, 25).map(mapEmployee),
    meta: { page, pageSize: 25, hasMore: rows.length > 25 },
  };
}
export async function directoryEmployee(env: Env, employeeId: string) {
  const params = new URLSearchParams({
    select: DIRECTORY_SELECT,
    id: `eq.${employeeId}`,
    archived_at: 'is.null',
    limit: '1',
  });
  const rows = await supabaseRequest<DirectoryRow[]>(env, `/rest/v1/employees?${params}`);
  const row = rows[0];
  if (!row) return null;
  const result = mapEmployee(row);
  if (row.departments) {
    if (row.departments.manager_employee_id === row.id) result.managerName = 'CEO / Master';
    else {
      const managerParams = new URLSearchParams({
        select: 'full_name',
        id: `eq.${row.departments.manager_employee_id}`,
        limit: '1',
      });
      const managers = await supabaseRequest<{ full_name: string }[]>(
        env,
        `/rest/v1/employees?${managerParams}`,
      );
      result.managerName = managers[0]?.full_name ?? null;
    }
  }
  if (
    row.avatar_path &&
    row.app_accounts &&
    row.avatar_path.startsWith(`${row.app_accounts.auth_user_id}/`)
  ) {
    result.avatarUrl = await signAvatar(env, row.avatar_path);
  }
  return result;
}
export const listDepartments = (env: Env) =>
  supabaseRequest<{ id: string; name: string }[]>(
    env,
    '/rest/v1/departments?select=id,name&archived_at=is.null&order=name&limit=100',
  );
export const editEmployee = (
  env: Env,
  actorId: string,
  employeeId: string,
  input: AdminEmployeeUpdate,
) =>
  supabaseRequest(env, '/rest/v1/rpc/crm_admin_update_employee', {
    method: 'POST',
    body: JSON.stringify({
      actor_uuid: actorId,
      employee_uuid: employeeId,
      employee_name: input.fullName,
      employee_job_title: input.jobTitle,
      employee_department_id: input.departmentId,
      account_status: input.status,
    }),
  });
export const beginPasswordReset = (env: Env, actorId: string, employeeId: string) =>
  supabaseRequest<string>(env, '/rest/v1/rpc/crm_begin_password_reset', {
    method: 'POST',
    body: JSON.stringify({ actor_uuid: actorId, employee_uuid: employeeId }),
  });
