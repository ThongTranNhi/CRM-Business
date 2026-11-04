import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { uploadAvatar } from '../api/profile.api';
import { employeeCodeSchema, fullNameSchema } from '../schemas/profile.schema';
import type { OwnProfile, ProfileUpdate } from '../types';
import { ProfileAvatarField } from './ProfileAvatarField';

interface Props {
  profile: OwnProfile;
  save: (input: ProfileUpdate) => Promise<unknown>;
}

/** Lỗi đầu tiên của các ô (họ tên, mã nhân viên), hoặc null khi hợp lệ. */
function firstError(name: string, code: string): string | null {
  const nameResult = fullNameSchema.safeParse(name);
  if (!nameResult.success) return nameResult.error.issues[0]?.message ?? 'Họ tên không hợp lệ';
  const codeResult = employeeCodeSchema.safeParse(code);
  if (!codeResult.success) {
    return codeResult.error.issues[0]?.message ?? 'Mã nhân viên không hợp lệ';
  }
  return null;
}

/** Ảnh gửi lên API: ảnh mới (path sau khi upload), null = gỡ ảnh, undefined = giữ nguyên. */
async function nextAvatarPath(file: File | null, removing: boolean) {
  if (file) return uploadAvatar(file);
  return removing ? null : undefined;
}

export function ProfileForm({ profile, save }: Props) {
  const [name, setName] = useState(profile.fullName);
  const [code, setCode] = useState(profile.employeeCode ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [removingAvatar, setRemovingAvatar] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const invalid = firstError(name, code);
    if (invalid) {
      setError(invalid);
      return;
    }
    setBusy(true);
    try {
      const avatarPath = await nextAvatarPath(file, removingAvatar);
      const fullName = name.trim();
      await save({
        employeeCode: code.trim() || null,
        // Chỉ gửi khi đổi: không ghi thêm audit đổi tên khi người dùng chỉ sửa mã hoặc ảnh.
        ...(fullName !== profile.fullName ? { fullName } : {}),
        ...(avatarPath !== undefined ? { avatarPath } : {}),
      });
      setFile(null);
      setRemovingAvatar(false);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được hồ sơ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <ProfileAvatarField
        fullName={profile.fullName}
        avatarUrl={profile.avatarUrl}
        removing={removingAvatar}
        disabled={busy}
        onRemoveChange={setRemovingAvatar}
        onFileChange={setFile}
      />
      <Input
        label="Họ tên"
        placeholder="Ví dụ: Nguyễn Văn An"
        value={name}
        maxLength={120}
        disabled={busy}
        onChange={(event) => setName(event.target.value)}
      />
      <Input
        label="Mã nhân viên"
        placeholder="Có thể cập nhật sau"
        value={code}
        maxLength={50}
        disabled={busy}
        onChange={(event) => setCode(event.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-danger-700">
          {error}
        </p>
      )}
      {saved && (
        <p role="status" className="text-sm text-gray-700">
          Đã lưu hồ sơ.
        </p>
      )}
      <Button type="submit" loading={busy}>
        Lưu hồ sơ
      </Button>
    </form>
  );
}
