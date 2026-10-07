import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';

// Test chạy được trên máy sạch (không có .env.local): biến môi trường giả, không gọi mạng.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      env: {
        VITE_SUPABASE_URL: 'http://localhost:54321',
        VITE_SUPABASE_ANON_KEY: 'test-anon-key',
        VITE_API_URL: 'http://localhost:8787',
      },
    },
  }),
);
