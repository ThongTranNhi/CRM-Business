import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Button, Input } from '@/components/ui';
import { changePassword } from '../api/auth.api';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { registrationSchema } from '../schemas/registration.schema';

export function ChangePasswordPage() {
  const account = useCurrentUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault();
    const username = account.data?.username;
    const parsed = registrationSchema.safeParse({ username, password, confirmPassword });
    if (!username || !parsed.success) {
      setError(
        parsed.success
          ? 'Chỉ tài khoản username đổi mật khẩu tại đây'
          : (parsed.error.issues[0]?.message ?? 'Thông tin không hợp lệ'),
      );
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await changePassword(username, currentPassword, password);
      await queryClient.invalidateQueries({ queryKey: ['account-state'] });
      navigate('/app/profile', { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không đổi được mật khẩu');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      onSubmit={submit}
      className="mx-auto max-w-md space-y-4 rounded-card border border-gray-200 bg-white p-6"
    >
      <h1 className="text-xl font-semibold">Đổi mật khẩu</h1>
      <p className="text-sm text-gray-600">
        Nếu được cấp mật khẩu tạm, bạn cần đổi trước khi tiếp tục.
      </p>
      <Input
        label="Mật khẩu hiện tại / mật khẩu tạm"
        type="password"
        autoComplete="current-password"
        value={currentPassword}
        onChange={(event) => setCurrentPassword(event.target.value)}
      />
      <Input
        label="Mật khẩu mới"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        label="Xác nhận mật khẩu mới"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-danger-700">
          {error}
        </p>
      )}
      <Button type="submit" loading={busy}>
        Đổi mật khẩu
      </Button>
    </form>
  );
}
