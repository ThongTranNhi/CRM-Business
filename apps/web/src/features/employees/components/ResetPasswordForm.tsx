import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { useMutation } from '@tanstack/react-query';
import { resetPassword } from '../api/directory.api';

export function ResetPasswordForm({
  employeeId,
  username,
}: {
  employeeId: string;
  username: string;
}) {
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: (value: string) => resetPassword(employeeId, value) });
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (password.length < 12 || password.length > 128 || password !== confirmation) {
      setError('Mật khẩu tạm cần 12–128 ký tự và xác nhận trùng khớp.');
      return;
    }
    try {
      await mutation.mutateAsync(password);
      setPassword('');
      setConfirmation('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không đặt lại được mật khẩu');
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold">Đặt lại mật khẩu cho {username}</h2>
      <p className="text-sm text-gray-600">
        Thao tác sẽ kết thúc các phiên cũ. Giao mật khẩu tạm trực tiếp cho nhân viên; họ phải đổi
        trước khi tiếp tục.
      </p>
      <Input
        label="Mật khẩu tạm"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <Input
        label="Xác nhận mật khẩu tạm"
        type="password"
        autoComplete="new-password"
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-danger-700">
          {error}
        </p>
      )}
      {mutation.isSuccess && !error && (
        <p role="status">Đã đặt mật khẩu tạm. Nhân viên cần đăng nhập lại.</p>
      )}
      <Button type="submit" variant="danger" loading={mutation.isPending}>
        Đặt lại mật khẩu
      </Button>
    </form>
  );
}
