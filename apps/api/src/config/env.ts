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

const escapeRegExp = (text: string) => text.replace(/[.+?^${}()|[\]\\]/g, '\\$&');

/**
 * Mẫu hẹp → regex: `https://`, đúng một `*`, `*` nằm giữa một nhãn tên miền đã có chữ cố định phía trước (vd.
 * `crm-business-git-*-team.vercel.app`) và chỉ khớp chữ thường / số / gạch ngang — không khớp dấu chấm nên không lan
 * sang tên miền khác. `*` đứng đầu nhãn (`https://*.vercel.app` — mọi app Vercel), http, nhiều `*` → null (bỏ qua).
 */
function narrowOriginPattern(entry: string): RegExp | null {
  const star = entry.indexOf('*');
  const isNarrow =
    entry.startsWith('https://') &&
    star === entry.lastIndexOf('*') &&
    !/[./]/.test(entry.charAt(star - 1)) &&
    !entry.slice('https://'.length).includes('/');
  if (!isNarrow) return null;
  return new RegExp(`^${escapeRegExp(entry).replace('*', '[a-z0-9-]+')}$`);
}

/** Origin được gọi API: trùng đúng một mục của ALLOWED_ORIGINS, hoặc khớp một mẫu hẹp có `*` (Preview của Vercel). */
export function isAllowedOrigin(origin: string, allowed: string[]): boolean {
  return allowed.some((entry) =>
    entry.includes('*') ? (narrowOriginPattern(entry)?.test(origin) ?? false) : entry === origin,
  );
}
