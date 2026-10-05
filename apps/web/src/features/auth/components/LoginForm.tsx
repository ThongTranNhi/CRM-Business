import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button, Icon, Input } from '@/components/ui';
import { signInWithGoogle, signInWithPassword } from '../api/auth.api';
import { validateLogin, type LoginErrors } from '../schemas/login.schema';

const DEFAULT_REDIRECT = '/app';

export function LoginForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState<LoginErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);

  async function handleGoogleLogin() {
    setFormError(null);
    setGoogleSubmitting(true);
    try {
      await signInWithGoogle();
    } catch {
      setFormError('Không thể mở đăng nhập Google. Vui lòng thử lại hoặc liên hệ quản trị viên.');
    } finally {
      setGoogleSubmitting(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validateLogin({ username, password });
    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signInWithPassword(username.trim(), password);
      const from = (location.state as { from?: string } | null)?.from ?? DEFAULT_REDIRECT;
      navigate(from, { replace: true });
    } catch {
      setFormError('Không đăng nhập được. Kiểm tra username, mật khẩu và kết nối API.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-4">
      <Input
        label="Tên đăng nhập"
        type="text"
        autoComplete="username"
        placeholder="nguyenvana"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        error={fieldErrors.username}
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
        <span className="text-sm text-gray-400">Quên mật khẩu? Liên hệ CEO hoặc Master</span>
      </div>

      {formError && (
        <p role="alert" className="rounded-lg bg-danger-100 px-3 py-2 text-sm text-danger-800">
          {formError}
        </p>
      )}

      <Button type="submit" loading={submitting} disabled={googleSubmitting} className="w-full">
        {submitting ? 'Đang đăng nhập...' : 'Đăng nhập'}
      </Button>
      <div className="flex items-center gap-3 text-sm text-gray-400">
        <span className="h-px flex-1 bg-gray-200" />
        <span>hoặc</span>
        <span className="h-px flex-1 bg-gray-200" />
      </div>
      <Button
        type="button"
        variant="secondary"
        loading={googleSubmitting}
        disabled={submitting}
        onClick={handleGoogleLogin}
        className="w-full"
      >
        {googleSubmitting ? 'Đang mở Google...' : 'Đăng nhập bằng Google'}
      </Button>
    </form>
  );
}
