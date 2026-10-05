import type { Env } from '../config/env';
import { supabaseRequest } from './supabase';

/** URL ký sống 5 phút cho tệp trong bucket private (rules/security-rules.md mục File). */
const SIGNED_URL_TTL_SECONDS = 300;

const encodePath = (path: string) => path.split('/').map(encodeURIComponent).join('/');
const toAbsolute = (env: Env, signedPath: string) =>
  new URL(`/storage/v1${signedPath}`, env.SUPABASE_URL).toString();

export async function signStorageUrl(env: Env, bucket: string, path: string): Promise<string> {
  const result = await supabaseRequest<{ signedURL: string }>(
    env,
    `/storage/v1/object/sign/${bucket}/${encodePath(path)}`,
    { method: 'POST', body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS }) },
  );
  return toAbsolute(env, result.signedURL);
}

/** Ký nhiều tệp trong một request; trả Map path → URL, bỏ qua tệp không ký được. */
export async function signStorageUrls(
  env: Env,
  bucket: string,
  paths: string[],
): Promise<Map<string, string>> {
  if (paths.length === 0) return new Map();
  const results = await supabaseRequest<{ path: string | null; signedURL: string | null }[]>(
    env,
    `/storage/v1/object/sign/${bucket}`,
    { method: 'POST', body: JSON.stringify({ expiresIn: SIGNED_URL_TTL_SECONDS, paths }) },
  );
  return new Map(
    results.flatMap(({ path, signedURL }) =>
      path && signedURL ? [[path, toAbsolute(env, signedURL)] as const] : [],
    ),
  );
}
