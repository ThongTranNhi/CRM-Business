import { z } from 'zod';

export const credentialsSchema = z
  .object({
    username: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9][a-z0-9_.-]{2,31}$/),
    password: z.string().min(12).max(128),
  })
  .strict();
export const newPasswordSchema = z.object({ password: z.string().min(12).max(128) }).strict();
