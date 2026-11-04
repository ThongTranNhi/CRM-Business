import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import * as linksService from './tasks.links.service';
import { addTaskLinkSchema, uuidSchema } from './tasks.schema';

// Link kết quả / tài liệu trong drawer chi tiết task (/api/tasks/:id/links).

const taskId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('id'));
const linkId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('linkId'));

export async function links(c: Context<AppEnv>) {
  return c.json({ data: await linksService.getLinks(requestScope(c), taskId(c)) });
}

export async function addLink(c: Context<AppEnv>) {
  const input = parseInput(addTaskLinkSchema, await readJson(c));
  return c.json({ data: await linksService.addLink(requestScope(c), taskId(c), input) }, 201);
}

export async function removeLink(c: Context<AppEnv>) {
  return c.json({ data: await linksService.removeLink(requestScope(c), taskId(c), linkId(c)) });
}
