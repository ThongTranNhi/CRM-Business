import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import {
  boardQuerySchema,
  collaboratorsSchema,
  createTaskSchema,
  moveTaskSchema,
  updateTaskSchema,
  uuidSchema,
} from './tasks.schema';
import * as tasksService from './tasks.service';

const boardId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('boardId'));
const taskId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('id'));

export async function board(c: Context<AppEnv>) {
  const { doneLimit } = parseInput(boardQuerySchema, c.req.query());
  return c.json({ data: await tasksService.getBoard(requestScope(c), boardId(c), doneLimit) });
}

export async function create(c: Context<AppEnv>) {
  const input = parseInput(createTaskSchema, await readJson(c));
  return c.json({ data: await tasksService.createTask(requestScope(c), boardId(c), input) }, 201);
}

export async function detail(c: Context<AppEnv>) {
  return c.json({ data: await tasksService.getTask(requestScope(c), taskId(c)) });
}

export async function update(c: Context<AppEnv>) {
  const input = parseInput(updateTaskSchema, await readJson(c));
  return c.json({ data: await tasksService.updateTask(requestScope(c), taskId(c), input) });
}

export async function move(c: Context<AppEnv>) {
  const input = parseInput(moveTaskSchema, await readJson(c));
  return c.json({ data: await tasksService.moveTask(requestScope(c), taskId(c), input) });
}

export async function collaborators(c: Context<AppEnv>) {
  const { employeeIds } = parseInput(collaboratorsSchema, await readJson(c));
  const task = await tasksService.setCollaborators(requestScope(c), taskId(c), employeeIds);
  return c.json({ data: task });
}

export async function archive(c: Context<AppEnv>) {
  await tasksService.archiveTask(requestScope(c), taskId(c));
  return c.body(null, 204);
}
