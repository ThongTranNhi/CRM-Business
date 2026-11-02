import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MissingEnvPage } from '@/app/MissingEnvPage';
import { missingEnv } from '@/app/missing-env';
import '@/styles/global.css';

const root = createRoot(document.getElementById('root')!);
const missing = missingEnv(import.meta.env);

// Kiểm tra biến trước khi tải App: lib/supabase.ts gọi createClient() ngay khi được import, thiếu URL là lỗi.
if (missing.length > 0) {
  root.render(<MissingEnvPage missing={missing} />);
} else {
  void import('@/app/App').then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
}
