import type { Context } from 'hono';
import type { AppEnv } from '../../lib/app-env';
import { requestScope } from '../../lib/request-scope';
import { parseInput, readJson } from '../../lib/validation';
import * as productsService from './assets.products.service';
import {
  createProductSchema,
  formOptionsQuerySchema,
  listProductsQuerySchema,
  updateProductSchema,
  uuidSchema,
} from './assets.schema';

const productId = (c: Context<AppEnv>) => parseInput(uuidSchema, c.req.param('id'));

export async function listProducts(c: Context<AppEnv>) {
  const query = parseInput(listProductsQuerySchema, c.req.query());
  return c.json(await productsService.listProducts(requestScope(c), query));
}

export async function productFormOptions(c: Context<AppEnv>) {
  const { departmentId } = parseInput(formOptionsQuerySchema, c.req.query());
  return c.json({ data: await productsService.getFormOptions(requestScope(c), departmentId) });
}

export async function createProduct(c: Context<AppEnv>) {
  const input = parseInput(createProductSchema, await readJson(c));
  return c.json({ data: await productsService.createProduct(requestScope(c), input) }, 201);
}

export async function updateProduct(c: Context<AppEnv>) {
  const input = parseInput(updateProductSchema, await readJson(c));
  const product = await productsService.updateProduct(requestScope(c), productId(c), input);
  return c.json({ data: product });
}

export async function archiveProduct(c: Context<AppEnv>) {
  await productsService.archiveProduct(requestScope(c), productId(c));
  return c.body(null, 204);
}
