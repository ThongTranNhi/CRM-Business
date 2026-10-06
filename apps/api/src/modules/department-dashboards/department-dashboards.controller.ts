import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import { createDashboardSchema, dashboardIdSchema } from './department-dashboards.schema';
import * as dashboardsService from './department-dashboards.service';

export async function list(c: Context<AppEnv>) {
  return c.json({ data: await dashboardsService.listDashboards(requestScope(c)) });
}

export async function detail(c: Context<AppEnv>) {
  const id = parseInput(dashboardIdSchema, c.req.param('id'));
  return c.json({ data: await dashboardsService.getDashboard(requestScope(c), id) });
}

export async function create(c: Context<AppEnv>) {
  const input = parseInput(createDashboardSchema, await readJson(c));
  return c.json({ data: await dashboardsService.createDashboard(requestScope(c), input) }, 201);
}
