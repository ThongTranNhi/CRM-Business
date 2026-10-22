import { z } from 'zod';
import { paginationSchema, searchSchema } from '../../lib/pagination';
import { PRODUCT_KINDS, PRODUCT_STATUSES } from './assets.types';

export const uuidSchema = z.uuid();

/** `?q=&departmentId=&status=&kind=&page=&pageSize=` — q tìm theo tên sản phẩm. */
export const listProductsQuerySchema = paginationSchema.extend({
  q: searchSchema,
  departmentId: z.uuid().optional(),
  status: z.enum(PRODUCT_STATUSES).optional(),
  kind: z.enum(PRODUCT_KINDS).optional(),
});

export const formOptionsQuerySchema = z.object({ departmentId: z.uuid() });

const name = z.string().trim().min(1, 'Nhập tên sản phẩm').max(120, 'Tên tối đa 120 ký tự');
// Chỉ http(s): link mở bằng thẻ <a> trên giao diện — chặn javascript:, data:… (DB kiểm tra lại).
const url = z
  .string()
  .trim()
  .max(2000, 'Link tối đa 2000 ký tự')
  .regex(/^https?:\/\/\S+$/i, 'Link phải bắt đầu bằng http:// hoặc https://');
const description = z.string().trim().max(2000, 'Mô tả tối đa 2000 ký tự').nullable();
const memberIds = z.array(z.uuid()).max(20, 'Tối đa 20 người cùng phụ trách');

export const createProductSchema = z.object({
  departmentId: z.uuid(),
  name,
  url,
  description: description.default(null),
  status: z.enum(PRODUCT_STATUSES).default('developing'),
  kind: z.enum(PRODUCT_KINDS).default('company'),
  ownerEmployeeId: z.uuid(),
  projectId: z.uuid().nullable().default(null),
  memberIds: memberIds.default([]),
});

/** PATCH: chỉ gửi trường cần đổi; không đổi phòng ban. */
export const updateProductSchema = z
  .object({
    name,
    url,
    description,
    status: z.enum(PRODUCT_STATUSES),
    kind: z.enum(PRODUCT_KINDS),
    ownerEmployeeId: z.uuid(),
    projectId: z.uuid().nullable(),
    memberIds,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Không có thay đổi nào');

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
