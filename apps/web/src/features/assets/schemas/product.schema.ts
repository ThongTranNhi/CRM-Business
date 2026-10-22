import { z } from 'zod';
import { PRODUCT_KINDS, PRODUCT_STATUSES } from '../types';

/** Form thêm / sửa sản phẩm. '' ở ô chọn = chưa chọn. */
export const productFormSchema = z.object({
  departmentId: z.string().min(1, 'Vui lòng chọn phòng ban'),
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên sản phẩm')
    .max(120, 'Tên sản phẩm tối đa 120 ký tự'),
  // Chỉ http(s): link được mở bằng thẻ <a> (server kiểm tra lại).
  url: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập link sản phẩm')
    .max(2000, 'Link tối đa 2000 ký tự')
    .regex(/^https?:\/\/\S+$/i, 'Link phải bắt đầu bằng http:// hoặc https://'),
  description: z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự'),
  status: z.enum(PRODUCT_STATUSES),
  kind: z.enum(PRODUCT_KINDS),
  ownerEmployeeId: z.string().min(1, 'Vui lòng chọn người phụ trách chính'),
  projectId: z.string(),
  memberIds: z.array(z.string()).max(20, 'Tối đa 20 người cùng phụ trách'),
});

export type ProductForm = z.infer<typeof productFormSchema>;
export type ProductFormErrors = Partial<Record<keyof ProductForm, string>>;
