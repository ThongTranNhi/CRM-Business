import type { Role } from '../../config/constants';
import type { Env } from '../../config/env';
import { forbidden, notFound } from '../../lib/app-error';
import { signStorageUrl, signStorageUrls } from '../../lib/storage';
import {
  beginPasswordReset,
  deleteEmployee as deleteEmployeeRecord,
  directoryEmployee,
  editEmployee,
  findAccount,
  findProfile,
  listDepartmentOptions,
  listDirectory,
  listEmployeeOptions,
  restoreEmployee as restoreEmployeeRecord,
  saveProfile,
} from './users.repository';
import type {
  AdminEmployeeUpdate,
  AvatarOwner,
  DeleteEmployeeTarget,
  DirectoryQuery,
  EmployeeDetail,
  ProfileUpdate,
} from './users.types';
import { setLocalPassword } from '../auth/auth.service';
import { countOpenTasks } from '../tasks/tasks.service';

const AVATAR_BUCKET = 'profile-avatars';

async function requireRole(env: Env, actorId: string, roles: readonly Role[]) {
  const account = await requireActiveAccount(env, actorId);
  if (!roles.some((role) => role === account.role)) throw forbidden();
}
const requireAdmin = (env: Env, actorId: string) => requireRole(env, actorId, ['super_admin']);

export async function getEmployeeDirectory(env: Env, actorId: string, query: DirectoryQuery) {
  await requireAdmin(env, actorId);
  return listDirectory(env, query);
}
export async function getEmployeeDetail(
  env: Env,
  actorId: string,
  employeeId: string,
): Promise<EmployeeDetail> {
  await requireAdmin(env, actorId);
  const found = await directoryEmployee(env, employeeId);
  if (!found) throw notFound();
  const { employee, authUserId } = found;
  const [avatarUrls, openTaskCount] = await Promise.all([
    getAvatarUrls(env, [{ ...employee, authUserId }]),
    countOpenTasks(env, employeeId),
  ]);
  return { ...employee, avatarUrl: avatarUrls.get(employee.id) ?? null, openTaskCount };
}
export async function getDepartmentOptions(env: Env, actorId: string) {
  await requireAdmin(env, actorId);
  return listDepartmentOptions(env);
}
/** Ô chọn người: chỉ người chưa bị xoá (view active_employees). */
export async function getEmployeeOptions(
  env: Env,
  actorId: string,
  query: { q?: string | undefined; departmentId?: string | undefined },
) {
  await requireRole(env, actorId, ['super_admin', 'hr_admin']);
  return listEmployeeOptions(env, query);
}
export async function updateEmployee(
  env: Env,
  actorId: string,
  change: { employeeId: string } & AdminEmployeeUpdate,
) {
  const target = await getEmployeeDetail(env, actorId, change.employeeId);
  if (target.role === 'super_admin') throw forbidden();
  await editEmployee(env, actorId, change);
  return getEmployeeDetail(env, actorId, change.employeeId);
}
/**
 * BR-53: xoá mềm. RPC chặn tự xoá, xoá Super Admin; khoá tài khoản, thu hồi phiên; có người nhận thì
 * bàn giao MỌI việc đang mở trong cùng giao dịch (sai một việc → không bàn giao việc nào).
 */
export async function deleteEmployee(env: Env, actorId: string, target: DeleteEmployeeTarget) {
  await requireAdmin(env, actorId);
  const openTaskCount = await countOpenTasks(env, target.employeeId);
  await deleteEmployeeRecord(env, actorId, target);
  const handedOverTaskCount = target.handoverEmployeeId ? openTaskCount : 0;
  return { deleted: true, openTaskCount, handedOverTaskCount };
}
export async function restoreEmployee(env: Env, actorId: string, employeeId: string) {
  await requireAdmin(env, actorId);
  await restoreEmployeeRecord(env, actorId, employeeId);
  return getEmployeeDetail(env, actorId, employeeId);
}
export async function resetEmployeePassword(
  env: Env,
  actorId: string,
  reset: { employeeId: string; password: string },
) {
  const target = await getEmployeeDetail(env, actorId, reset.employeeId);
  if (!target.username || target.role === 'super_admin' || target.status !== 'active')
    throw forbidden();
  const userId = await beginPasswordReset(env, actorId, reset.employeeId);
  // Fail closed: a failed Auth request leaves the account requiring a reset retry.
  await setLocalPassword(env, userId, reset.password);
  return { reset: true };
}

export async function requireActiveAccount(env: Env, userId: string) {
  const account = await findAccount(env, userId);
  if (!account || account.status !== 'active') throw forbidden();
  return account;
}

/** Map employeeId → signed URL; ảnh nằm ngoài thư mục của chính chủ thì không ký. */
export async function getAvatarUrls(env: Env, owners: AvatarOwner[]): Promise<Map<string, string>> {
  const owned = owners.filter(
    (owner) => owner.avatarPath && owner.avatarPath.startsWith(`${owner.authUserId}/`),
  );
  const urls = await signStorageUrls(
    env,
    AVATAR_BUCKET,
    owned.flatMap((owner) => (owner.avatarPath ? [owner.avatarPath] : [])),
  );
  return new Map(
    owned.flatMap((owner) => {
      const url = owner.avatarPath ? urls.get(owner.avatarPath) : undefined;
      return url ? [[owner.id, url] as const] : [];
    }),
  );
}

export async function getOwnProfile(env: Env, userId: string) {
  await requireActiveAccount(env, userId);
  const profile = await findProfile(env, userId);
  if (!profile)
    throw notFound('Chưa có hồ sơ. Vui lòng chạy migration đăng ký hoặc liên hệ quản trị viên');
  if (profile.avatarPath) {
    if (!profile.avatarPath.startsWith(`${userId}/`)) throw forbidden();
    profile.avatarUrl = await signStorageUrl(env, AVATAR_BUCKET, profile.avatarPath);
  }
  return profile;
}

export async function updateOwnProfile(env: Env, userId: string, input: ProfileUpdate) {
  if (input.avatarPath && !input.avatarPath.startsWith(`${userId}/`)) throw forbidden();
  await getOwnProfile(env, userId);
  await saveProfile(env, userId, input);
  return getOwnProfile(env, userId);
}
