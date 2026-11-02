import type { RequiredEnv } from './missing-env';

interface MissingEnvPageProps {
  missing: RequiredEnv[];
}

/**
 * Bản build thiếu biến môi trường (vd. Preview Vercel chưa trỏ Supabase staging): báo rõ thay vì trang trắng.
 * Không dùng components/ui hay router — các phần đó nằm trong App, chưa được tải.
 */
export function MissingEnvPage({ missing }: MissingEnvPageProps) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-lg rounded-card border border-gray-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold text-gray-900">Chưa cấu hình môi trường</h1>
        <p className="mt-2 text-sm text-gray-600">
          Bản web này được build thiếu biến môi trường nên chưa chạy được. Người quản trị cần khai
          báo các biến sau rồi deploy lại (xem docs/deployment/vercel.md):
        </p>
        <ul className="mt-3 list-disc space-y-1 pl-5 font-mono text-sm text-gray-800">
          {missing.map((key) => (
            <li key={key}>{key}</li>
          ))}
        </ul>
      </div>
    </main>
  );
}
