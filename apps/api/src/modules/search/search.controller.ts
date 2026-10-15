import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput } from '../../lib/validation';
import { searchQuerySchema } from './search.schema';
import * as searchService from './search.service';

export async function search(c: Context<AppEnv>) {
  const { q } = parseInput(searchQuerySchema, c.req.query());
  return c.json({ data: await searchService.search(requestScope(c), q) });
}
