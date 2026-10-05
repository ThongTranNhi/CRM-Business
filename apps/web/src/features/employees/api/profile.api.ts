import { apiRequest } from '@/lib/api-client';
import { supabase } from '@/lib/supabase';
import { avatarSchema } from '../schemas/profile.schema';
import type { OwnProfile, ProfileUpdate } from '../types';

export const getOwnProfile = () => apiRequest<OwnProfile>('/api/users/me/profile');
export const updateOwnProfile = (input: ProfileUpdate) =>
  apiRequest<OwnProfile>('/api/users/me/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export async function uploadAvatar(file: File): Promise<string> {
  const parsed = avatarSchema.safeParse(file);
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? 'Ảnh không hợp lệ');
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) throw new Error('File không phải ảnh hợp lệ');
  bitmap.close();
  const { data } = await supabase.auth.getSession();
  if (!data.session) throw new Error('Bạn cần đăng nhập');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[file.type];
  const path = `${data.session.user.id}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage
    .from('profile-avatars')
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error('Không tải được ảnh. Kiểm tra migration Storage và thử lại.');
  return path;
}
