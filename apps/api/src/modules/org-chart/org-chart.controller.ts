import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import * as orgChartService from './org-chart.service';

export async function orgChart(c: Context<AppEnv>) {
  return c.json({ data: await orgChartService.getOrgChart(requestScope(c)) });
}
