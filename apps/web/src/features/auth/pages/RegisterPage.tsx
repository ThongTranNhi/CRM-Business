import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, Input } from '@/components/ui';
import { registerAccount, signInWithGoogle } from '../api/auth.api';
import { registrationSchema } from '../schemas/registration.schema';

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '', confirmPassword: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const parsed = registrationSchema.safeParse(form);
    setMessage(null);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) next[String(issue.path[0])] ??= issue.message;
      setErrors(next);
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      await registerAccount(parsed.data.username, parsed.data.password);
      navigate('/app/profile', { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể tạo tài khoản');
    } finally { setBusy(false); }
  }
  async function google() {
    setMessage(null);
    setBusy(true);
    try { await signInWithGoogle(); }
    catch { setMessage('Không mở được Google. Vui lòng thử lại.'); }
    finally { setBusy(false); }
  }
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Tạo tài khoản CRM Business</h1>
        <p className="mt-2 text-sm text-gray-500">Đăng ký bằng username hoặc Google. Mã nhân viên và ảnh cập nhật sau.</p>
      </div>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Input label="Tên đăng nhập" autoComplete="username" value={form.username} error={errors.username}
          disabled={busy} onChange={(event) => setForm({ ...form, username: event.target.value })} />
        <Input label="Mật khẩu" type="password" autoComplete="new-password" value={form.password} error={errors.password}
          disabled={busy} onChange={(event) => setForm({ ...form, password: event.target.value })} />
        <Input label="Xác nhận mật khẩu" type="password" autoComplete="new-password" value={form.confirmPassword} error={errors.confirmPassword}
          disabled={busy} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} />
        {message && <p role="alert" className="text-sm text-danger-700">{message}</p>}
        <Button type="submit" loading={busy} className="w-full">Đăng ký</Button>
      </form>
      <Button variant="secondary" disabled={busy} className="w-full" onClick={google}>Đăng ký bằng Google</Button>
      <Link to="/auth/login" className="block text-sm text-primary-600 hover:underline">Đã có tài khoản? Đăng nhập</Link>
    </div>
  );
}
