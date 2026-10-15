import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import * as activitiesService from './tasks.activities.service';
import * as checklistService from './tasks.checklist.service';
import * as commentsService from './tasks.comments.service';
import {
  addChecklistItemSchema,
  addCommentSchema,
  feedQuerySchema,
  updateChecklistItemSchema,
  uuidSchema,
} from './tasks.schema';

// Drawer chi tiết task: checklist, bình luận, lịch sử (/api/tasks/:id/...).

const taskId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('id'));
const itemId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('itemId'));

export async function checklist(c: Context<AppEnv>) {
  return c.json({ data: await checklistService.getChecklist(requestScope(c), taskId(c)) });
}

export async function addChecklistItem(c: Context<AppEnv>) {
  const input = parseInput(addChecklistItemSchema, await readJson(c));
  const items = await checklistService.addItem(requestScope(c), taskId(c), input);
  return c.json({ data: items }, 201);
}

export async function updateChecklistItem(c: Context<AppEnv>) {
  const input = parseInput(updateChecklistItemSchema, await readJson(c));
  const items = await checklistService.updateItem(requestScope(c), taskId(c), itemId(c), input);
  return c.json({ data: items });
}

export async function removeChecklistItem(c: Context<AppEnv>) {
  const items = await checklistService.removeItem(requestScope(c), taskId(c), itemId(c));
  return c.json({ data: items });
}

export async function comments(c: Context<AppEnv>) {
  const query = parseInput(feedQuerySchema, c.req.query());
  return c.json(await commentsService.listComments(requestScope(c), taskId(c), query));
}

export async function addComment(c: Context<AppEnv>) {
  const input = parseInput(addCommentSchema, await readJson(c));
  return c.json({ data: await commentsService.addComment(requestScope(c), taskId(c), input) }, 201);
}

export async function activities(c: Context<AppEnv>) {
  const query = parseInput(feedQuerySchema, c.req.query());
  return c.json(await activitiesService.listActivities(requestScope(c), taskId(c), query));
}
