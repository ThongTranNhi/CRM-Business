/** Biến build bắt buộc (Vercel / `.env.local`). Thiếu thì Supabase client lỗi ngay khi tải module. */
export const REQUIRED_ENV = [
  'VITE_API_URL',
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_ANON_KEY',
] as const;
export type RequiredEnv = (typeof REQUIRED_ENV)[number];

/** Tên các biến bắt buộc đang trống (chỉ trả tên, không trả giá trị). */
export const missingEnv = (env: Partial<Record<RequiredEnv, string>>): RequiredEnv[] =>
  REQUIRED_ENV.filter((key) => !env[key]?.trim());
