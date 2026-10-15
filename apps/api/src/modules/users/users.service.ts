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
  DirectoryEmployee,
  DirectoryQuery,
  EmployeeDetail,
  ProfileUpdate,
} from './users.types';
import { setLocalPassword } from '../auth/auth.service';
import { countOwnedProjects } from '../projects/projects.service';
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
/** Hồ sơ + ảnh đại diện, không đếm việc (dùng khi sửa / khôi phục / đặt lại mật khẩu). */
async function loadEmployee(env: Env, employeeId: string): Promise<DirectoryEmployee> {
  const found = await directoryEmployee(env, employeeId);
  if (!found) throw notFound();
  const { employee, authUserId } = found;
  const avatarUrls = await getAvatarUrls(env, [{ ...employee, authUserId }]);
  return { ...employee, avatarUrl: avatarUrls.get(employee.id) ?? null };
}

/** GET chi tiết: kèm số việc đang mở, số dự án làm chủ để hộp thoại xoá nêu cần bàn giao gì (BR-53). */
export async function getEmployeeDetail(
  env: Env,
  actorId: string,
  employeeId: string,
): Promise<EmployeeDetail> {
  await requireAdmin(env, actorId);
  const [employee, openTaskCount, ownedProjectCount] = await Promise.all([
    loadEmployee(env, employeeId),
    countOpenTasks(env, employeeId),
    countOwnedProjects(env, employeeId),
  ]);
  return { ...employee, openTaskCount, ownedProjectCount };
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
  await requireAdmin(env, actorId);
  const target = await loadEmployee(env, change.employeeId);
  if (target.role === 'super_admin') throw forbidden();
  await editEmployee(env, actorId, change);
  return loadEmployee(env, change.employeeId);
}
/**
 * BR-53: xoá mềm. RPC chặn tự xoá, xoá Super Admin; khoá tài khoản, thu hồi phiên; có người nhận thì
 * bàn giao MỌI việc đang mở và quyền chủ MỌI dự án trong cùng giao dịch (sai một chỗ → không bàn giao gì).
 */
export async function deleteEmployee(env: Env, actorId: string, target: DeleteEmployeeTarget) {
  await requireAdmin(env, actorId);
  // RPC trả số việc đang mở / dự án đang làm chủ (còn ghi được) và số đã bàn giao thật.
  const result = await deleteEmployeeRecord(env, actorId, target);
  return { deleted: true, ...result };
}
export async function restoreEmployee(env: Env, actorId: string, employeeId: string) {
  await requireAdmin(env, actorId);
  await restoreEmployeeRecord(env, actorId, employeeId);
  return loadEmployee(env, employeeId);
}
export async function resetEmployeePassword(
  env: Env,
  actorId: string,
  reset: { employeeId: string; password: string },
) {
  await requireAdmin(env, actorId);
  const target = await loadEmployee(env, reset.employeeId);
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
