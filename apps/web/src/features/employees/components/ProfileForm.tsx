import { useState, type FormEvent } from 'react';
import { Button, Input } from '@/components/ui';
import { uploadAvatar } from '../api/profile.api';
import { employeeCodeSchema } from '../schemas/profile.schema';
import type { OwnProfile, ProfileUpdate } from '../types';

interface Props {
  profile: OwnProfile;
  save: (input: ProfileUpdate) => Promise<unknown>;
}

export function ProfileForm({ profile, save }: Props) {
  const [code, setCode] = useState(profile.employeeCode ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const parsed = employeeCodeSchema.safeParse(code);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Mã nhân viên không hợp lệ');
      return;
    }
    setBusy(true);
    try {
      const avatarPath = file ? await uploadAvatar(file) : undefined;
      await save({ employeeCode: parsed.data || null, ...(avatarPath ? { avatarPath } : {}) });
      setFile(null);
      setSaved(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Không lưu được hồ sơ');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {profile.avatarUrl && (
        <img
          src={profile.avatarUrl}
          alt={`Ảnh đại diện của ${profile.fullName}`}
          className="h-24 w-24 rounded-full object-cover"
        />
      )}
      <Input
        label="Mã nhân viên"
        placeholder="Có thể cập nhật sau"
        value={code}
        maxLength={50}
        disabled={busy}
        onChange={(event) => setCode(event.target.value)}
      />
      <Input
        label="Ảnh đại diện (JPG, PNG, WebP; tối đa 2 MB)"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={busy}
        onChange={(event) => setFile(event.target.files?.[0] ?? null)}
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
