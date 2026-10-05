import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Vui lòng nhập email').email('Email không hợp lệ'),
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type LoginErrors = Partial<Record<keyof LoginInput, string>>;

/** Trả về lỗi theo từng trường, rỗng nếu hợp lệ. */
export function validateLogin(input: LoginInput): LoginErrors {
  const result = loginSchema.safeParse(input);
  if (result.success) return {};
  const errors: LoginErrors = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof LoginInput;
    errors[field] ??= issue.message;
  }
  return errors;
}
