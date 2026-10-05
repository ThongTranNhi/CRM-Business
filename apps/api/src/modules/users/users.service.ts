import type { Env } from '../../config/env';
import { forbidden, notFound } from '../../lib/app-error';
import { beginPasswordReset, directoryEmployee, editEmployee, findAccount, findProfile, listDepartments, listDirectory, saveProfile, signAvatar } from './users.repository';
import type { AdminEmployeeUpdate, ProfileUpdate } from './users.types';
import { setLocalPassword } from '../auth/auth.service';

async function requireAdmin(env: Env, actorId: string) {
  const account = await requireActiveAccount(env, actorId);
  if (account.role !== 'super_admin') throw forbidden();
}
export async function getEmployeeDirectory(env: Env, actorId: string, page: number) {
  await requireAdmin(env, actorId);
  return listDirectory(env, page);
}
export async function getEmployeeDetail(env: Env, actorId: string, employeeId: string) {
  await requireAdmin(env, actorId);
  const employee = await directoryEmployee(env, employeeId);
  if (!employee) throw notFound();
  return employee;
}
export async function getDepartmentOptions(env: Env, actorId: string) {
  await requireAdmin(env, actorId);
  return listDepartments(env);
}
export async function updateEmployee(env: Env, actorId: string, employeeId: string, input: AdminEmployeeUpdate) {
  const target = await getEmployeeDetail(env, actorId, employeeId);
  if (target.role === 'super_admin') throw forbidden();
  await editEmployee(env, actorId, employeeId, input);
  return getEmployeeDetail(env, actorId, employeeId);
}
export async function resetEmployeePassword(env: Env, actorId: string, employeeId: string, password: string) {
  const target = await getEmployeeDetail(env, actorId, employeeId);
  if (!target.username || target.role === 'super_admin' || target.status !== 'active') throw forbidden();
  const userId = await beginPasswordReset(env, actorId, employeeId);
  // Fail closed: a failed Auth request leaves the account requiring a reset retry.
  await setLocalPassword(env, userId, password);
  return { reset: true };
}

export async function requireActiveAccount(env: Env, userId: string) {
  const account = await findAccount(env, userId);
  if (!account || account.status !== 'active') throw forbidden();
  return account;
}

export async function getOwnProfile(env: Env, userId: string) {
  const account = await requireActiveAccount(env, userId);
  const profile = await findProfile(env, account.id);
  if (!profile) throw notFound('Chưa có hồ sơ. Vui lòng chạy migration đăng ký hoặc liên hệ quản trị viên');
  if (profile.avatarPath) {
    if (!profile.avatarPath.startsWith(`${userId}/`)) throw forbidden();
    profile.avatarUrl = await signAvatar(env, profile.avatarPath);
  }
  return profile;
}

export async function updateOwnProfile(env: Env, userId: string, input: ProfileUpdate) {
  if (input.avatarPath && !input.avatarPath.startsWith(`${userId}/`)) throw forbidden();
  await getOwnProfile(env, userId);
  await saveProfile(env, userId, input);
  return getOwnProfile(env, userId);
}
