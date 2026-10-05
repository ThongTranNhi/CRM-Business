import { z } from 'zod';

export const departmentNameSchema = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên phòng ban')
  .max(120, 'Tên phòng ban tối đa 120 ký tự');
