import type { Context } from 'hono';
import { readEnv } from '../../config/env';
import type { AppEnv } from '../../lib/app-env';
import { parseInput, readJson } from '../../lib/validation';
import {
  adminEmployeeSchema,
  deleteEmployeeSchema,
  directoryQuerySchema,
  employeeIdSchema,
  employeeOptionsQuerySchema,
  profileUpdateSchema,
} from './users.schema';
import {
  deleteEmployee,
  getDepartmentOptions,
  getEmployeeDetail,
  getEmployeeDirectory,
  getEmployeeOptions,
  getOwnProfile,
  resetEmployeePassword,
  restoreEmployee,
  updateEmployee,
  updateOwnProfile,
} from './users.service';
import { newPasswordSchema } from '../auth/auth.schema';

const employeeId = (c: Context<AppEnv>) => parseInput(employeeIdSchema, c.req.param('id'));

export async function getProfile(c: Context<AppEnv>) {
  return c.json({ data: await getOwnProfile(readEnv(c.env), c.get('user').id) });
}

export async function patchProfile(c: Context<AppEnv>) {
  const input = parseInput(profileUpdateSchema, await readJson(c));
  return c.json({ data: await updateOwnProfile(readEnv(c.env), c.get('user').id, input) });
}

export async function directory(c: Context<AppEnv>) {
  const query = parseInput(directoryQuerySchema, c.req.query());
  return c.json(await getEmployeeDirectory(readEnv(c.env), c.get('user').id, query));
}
export async function detail(c: Context<AppEnv>) {
  return c.json({ data: await getEmployeeDetail(readEnv(c.env), c.get('user').id, employeeId(c)) });
}
export async function departmentOptions(c: Context<AppEnv>) {
  return c.json({ data: await getDepartmentOptions(readEnv(c.env), c.get('user').id) });
}
export async function employeeOptions(c: Context<AppEnv>) {
  const { q } = parseInput(employeeOptionsQuerySchema, c.req.query());
  return c.json({ data: await getEmployeeOptions(readEnv(c.env), c.get('user').id, q) });
}
export async function patchEmployee(c: Context<AppEnv>) {
  const input = parseInput(adminEmployeeSchema, await readJson(c));
  const change = { employeeId: employeeId(c), ...input };
  return c.json({ data: await updateEmployee(readEnv(c.env), c.get('user').id, change) });
}
export async function removeEmployee(c: Context<AppEnv>) {
  const { newManagerId } = parseInput(deleteEmployeeSchema, (await readJson(c)) ?? {});
  const target = { employeeId: employeeId(c), newManagerId };
  return c.json({ data: await deleteEmployee(readEnv(c.env), c.get('user').id, target) });
}
export async function restore(c: Context<AppEnv>) {
  return c.json({ data: await restoreEmployee(readEnv(c.env), c.get('user').id, employeeId(c)) });
}
export async function resetPassword(c: Context<AppEnv>) {
  const { password } = parseInput(newPasswordSchema, await readJson(c));
  c.header('Cache-Control', 'no-store');
  const reset = { employeeId: employeeId(c), password };
  return c.json({ data: await resetEmployeePassword(readEnv(c.env), c.get('user').id, reset) });
}
