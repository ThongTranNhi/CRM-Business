import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import * as issuedService from './assets.issued.service';
import {
  createIssuedAssetSchema,
  issueAssetSchema,
  listIssuedAssetsQuerySchema,
  returnAssetSchema,
  updateIssuedAssetSchema,
} from './assets.issued.schema';
import { uuidSchema } from './assets.schema';

const assetId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('id'));

export async function listIssuedAssets(c: Context<AppEnv>) {
  const query = parseInput(listIssuedAssetsQuerySchema, c.req.query());
  return c.json(await issuedService.listIssuedAssets(requestScope(c), query));
}

export async function issueFormOptions(c: Context<AppEnv>) {
  return c.json({ data: await issuedService.getIssueFormOptions(requestScope(c)) });
}

export async function assetHistory(c: Context<AppEnv>) {
  return c.json({ data: await issuedService.listAssetHistory(requestScope(c), assetId(c)) });
}

export async function createIssuedAsset(c: Context<AppEnv>) {
  const input = parseInput(createIssuedAssetSchema, await readJson(c));
  return c.json({ data: await issuedService.createIssuedAsset(requestScope(c), input) }, 201);
}

export async function updateIssuedAsset(c: Context<AppEnv>) {
  const input = parseInput(updateIssuedAssetSchema, await readJson(c));
  return c.json({
    data: await issuedService.updateIssuedAsset(requestScope(c), assetId(c), input),
  });
}

export async function archiveIssuedAsset(c: Context<AppEnv>) {
  await issuedService.archiveIssuedAsset(requestScope(c), assetId(c));
  return c.body(null, 204);
}

export async function issueAsset(c: Context<AppEnv>) {
  const input = parseInput(issueAssetSchema, await readJson(c));
  return c.json({ data: await issuedService.issueAsset(requestScope(c), assetId(c), input) });
}

export async function returnAsset(c: Context<AppEnv>) {
  const input = parseInput(returnAssetSchema, await readJson(c));
  return c.json({ data: await issuedService.returnAsset(requestScope(c), assetId(c), input) });
}
