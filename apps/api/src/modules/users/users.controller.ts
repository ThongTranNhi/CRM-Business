import type { Context } from 'hono';
import { readEnv } from '../../config/env';
import type { AppEnv } from '../../lib/app-env';
import { AppError } from '../../lib/app-error';
import {
  adminEmployeeSchema,
  directoryQuerySchema,
  employeeIdSchema,
  profileUpdateSchema,
} from './users.schema';
import {
  getDepartmentOptions,
  getEmployeeDetail,
  getEmployeeDirectory,
  getOwnProfile,
  resetEmployeePassword,
  updateEmployee,
  updateOwnProfile,
} from './users.service';
import { newPasswordSchema } from '../auth/auth.schema';

export async function getProfile(c: Context<AppEnv>) {
  return c.json({ data: await getOwnProfile(readEnv(c.env), c.get('user').id) });
}

export async function patchProfile(c: Context<AppEnv>) {
  const parsed = profileUpdateSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) throw new AppError('INVALID_INPUT', 'Thông tin hồ sơ không hợp lệ');
  return c.json({ data: await updateOwnProfile(readEnv(c.env), c.get('user').id, parsed.data) });
}

function employeeId(c: Context<AppEnv>) {
  const parsed = employeeIdSchema.safeParse(c.req.param('id'));
  if (!parsed.success) throw new AppError('INVALID_INPUT', 'ID nhân viên không hợp lệ');
  return parsed.data;
}
export async function directory(c: Context<AppEnv>) {
  const parsed = directoryQuerySchema.safeParse(c.req.query());
  if (!parsed.success) throw new AppError('INVALID_INPUT', 'Phân trang không hợp lệ');
  return c.json(await getEmployeeDirectory(readEnv(c.env), c.get('user').id, parsed.data.page));
}
export async function detail(c: Context<AppEnv>) {
  return c.json({ data: await getEmployeeDetail(readEnv(c.env), c.get('user').id, employeeId(c)) });
}
export async function departmentOptions(c: Context<AppEnv>) {
  return c.json({ data: await getDepartmentOptions(readEnv(c.env), c.get('user').id) });
}
export async function patchEmployee(c: Context<AppEnv>) {
  const input = adminEmployeeSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) throw new AppError('INVALID_INPUT', 'Thông tin nhân viên không hợp lệ');
  return c.json({
    data: await updateEmployee(readEnv(c.env), c.get('user').id, employeeId(c), input.data),
  });
}
export async function resetPassword(c: Context<AppEnv>) {
  const input = newPasswordSchema.safeParse(await c.req.json().catch(() => null));
  if (!input.success) throw new AppError('INVALID_INPUT', 'Mật khẩu tạm cần 12–128 ký tự');
  c.header('Cache-Control', 'no-store');
  return c.json({
    data: await resetEmployeePassword(
      readEnv(c.env),
      c.get('user').id,
      employeeId(c),
      input.data.password,
    ),
  });
}
