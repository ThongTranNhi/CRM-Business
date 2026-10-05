import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, Input } from '@/components/ui';
import { signInWithPassword } from '../api/auth.api';
import { validateLogin, type LoginErrors } from '../schemas/login.schema';

const DEFAULT_REDIRECT = '/app';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateLogin({ email, password });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signInWithPassword(email.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? DEFAULT_REDIRECT;
      navigate(from, { replace: true });
    } catch {
      setFormError('Email hoặc mật khẩu không đúng');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label="Email"
        type="email"
        autoComplete="email"
        placeholder="ten@congty.vn"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={fieldErrors.email}
        leftIcon={<Icon name="mail" size={18} />}
      />
      <Input
        label="Mật khẩu"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={fieldErrors.password}
        leftIcon={<Icon name="lock" size={18} />}
      />

      <div className="flex justify-end">
        {/* Trang quên mật khẩu làm ở nhiệm vụ auth tiếp theo */}
        <span className="text-sm text-gray-400">Quên mật khẩu? Liên hệ HR</span>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-800">
          {formError}
        </p>
      )}

      <Button type="submit" loading={submitting} className="w-full">
        {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>
    </form>
  );
}
