import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import {
  addMemberSchema,
  createDepartmentSchema,
  deleteDepartmentSchema,
  departmentIdSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from './departments.schema';
import * as departmentsService from './departments.service';

const departmentId = (c: Context<AppEnv>) => parseInput(departmentIdSchema, c.req.param('id'));

export async function list(c: Context<AppEnv>) {
  const query = parseInput(listDepartmentsQuerySchema, c.req.query());
  return c.json(await departmentsService.listDepartments(requestScope(c), query));
}

export async function detail(c: Context<AppEnv>) {
  return c.json({ data: await departmentsService.getDepartment(requestScope(c), departmentId(c)) });
}

export async function create(c: Context<AppEnv>) {
  const input = parseInput(createDepartmentSchema, await readJson(c));
  return c.json({ data: await departmentsService.createDepartment(requestScope(c), input) }, 201);
}

export async function update(c: Context<AppEnv>) {
  const input = parseInput(updateDepartmentSchema, await readJson(c));
  const department = await departmentsService.updateDepartment(
    requestScope(c),
    departmentId(c),
    input,
  );
  return c.json({ data: department });
}

export async function addMember(c: Context<AppEnv>) {
  const input = parseInput(addMemberSchema, await readJson(c));
  const department = await departmentsService.addMember(requestScope(c), departmentId(c), input);
  return c.json({ data: department });
}

export async function remove(c: Context<AppEnv>) {
  const input = parseInput(deleteDepartmentSchema, (await readJson(c)) ?? {});
  const result = await departmentsService.deleteDepartment(
    requestScope(c),
    departmentId(c),
    input.receivingDepartmentId,
  );
  return c.json({ data: result });
}

export async function restore(c: Context<AppEnv>) {
  return c.json({
    data: await departmentsService.restoreDepartment(requestScope(c), departmentId(c)),
  });
}
