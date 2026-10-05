import { z } from 'zod';

/** Bindings do Cloudflare Workers truyền vào (wrangler.toml [vars], secret, .dev.vars). */
export interface Bindings {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ALLOWED_ORIGINS: string;
}

const envSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL không hợp lệ'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Thiếu SUPABASE_SERVICE_ROLE_KEY'),
  ALLOWED_ORIGINS: z.string().default(''),
});

export type Env = z.infer<typeof envSchema>;

/** Kiểm tra env mỗi request; sai cấu hình -> lỗi 500 rõ ràng thay vì lỗi khó hiểu về sau. */
export function readEnv(bindings: Bindings): Env {
  const result = envSchema.safeParse(bindings);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join('.')).join(', ');
    throw new Error(`Cấu hình môi trường API không hợp lệ: ${fields}`);
  }
  return result.data;
}

export function allowedOrigins(raw: string): string[] {
  return raw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}
