import { describe, expect, it } from 'vitest';
import { missingEnv } from './missing-env';

describe('required build env', () => {
  it('lists empty or blank variables by name', () => {
    expect(missingEnv({ VITE_API_URL: 'https://api.test', VITE_SUPABASE_URL: ' ' })).toEqual([
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ]);
  });

  it('passes when every variable is set', () => {
    expect(
      missingEnv({
        VITE_API_URL: 'https://api.test',
        VITE_SUPABASE_URL: 'https://x.supabase.co',
        VITE_SUPABASE_ANON_KEY: 'anon',
      }),
    ).toEqual([]);
  });
});
