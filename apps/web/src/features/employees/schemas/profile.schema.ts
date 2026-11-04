import { z } from 'zod';

export const employeeCodeSchema = z.string().trim().max(50, 'Mã nhân viên tối đa 50 ký tự');
/** Khớp API / RPC update_own_profile: 1 → 120 ký tự sau khi bỏ khoảng trắng hai đầu. */
export const fullNameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập họ tên')
  .max(120, 'Họ tên tối đa 120 ký tự');
export const avatarSchema = z
  .custom<File>((value) => value instanceof File)
  .refine(
    (file) => file.size > 0 && file.size <= 2 * 1024 * 1024,
    'Ảnh phải nhỏ hơn hoặc bằng 2 MB',
  )
  .refine(
    (file) => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type),
    'Chọn ảnh JPG, PNG hoặc WebP',
  );
