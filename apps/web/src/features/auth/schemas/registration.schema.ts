import { z } from 'zod';

export const registrationSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(
        /^[a-z0-9][a-z0-9_.-]{2,31}$/,
        'Username 3–32 ký tự: chữ không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới',
      ),
    password: z.string().min(12, 'Mật khẩu cần ít nhất 12 ký tự').max(128, 'Mật khẩu quá dài'),
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Mật khẩu xác nhận không khớp',
  });
