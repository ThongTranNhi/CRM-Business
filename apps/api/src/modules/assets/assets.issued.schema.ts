import { z } from 'zod';
import { paginationSchema, searchSchema } from '../../lib/pagination';
import {
  ASSET_HOLDER_TYPES,
  EDITABLE_ASSET_STATUSES,
  ISSUED_ASSET_CATEGORIES,
  ISSUED_ASSET_STATUSES,
} from './assets.issued.types';

/** `?q=&category=&status=&holderType=&page=&pageSize=` — q tìm theo tên hoặc mã tài sản. */
export const listIssuedAssetsQuerySchema = paginationSchema.extend({
  q: searchSchema,
  category: z.enum(ISSUED_ASSET_CATEGORIES).optional(),
  status: z.enum(ISSUED_ASSET_STATUSES).optional(),
  holderType: z.enum(ASSET_HOLDER_TYPES).optional(),
});

const date = z.iso.date('Ngày không hợp lệ');
const note = z.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự').nullable();
// Ô mã để trống = không có mã.
const code = z
  .string()
  .trim()
  .max(40, 'Mã tối đa 40 ký tự')
  .nullable()
  .transform((value) => value || null);
const name = z.string().trim().min(1, 'Nhập tên tài sản').max(120, 'Tên tối đa 120 ký tự');

/** PATCH: chỉ gửi trường cần đổi. Trạng thái Đang cấp do cấp / thu hồi đặt, không sửa tay. */
export const updateIssuedAssetSchema = z
  .object({
    code,
    name,
    category: z.enum(ISSUED_ASSET_CATEGORIES),
    status: z.enum(EDITABLE_ASSET_STATUSES),
    expiresOn: date.nullable(),
    note,
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, 'Không có thay đổi nào');

const issueBase = {
  issuerEmployeeId: z.uuid('Vui lòng chọn người cấp'),
  issuedOn: date,
  note: note.default(null),
};

/** Đối tượng sử dụng: cá nhân cần `employeeId`, phòng ban cần `departmentId`, công ty không cần gì thêm. */
export const issueAssetSchema = z.discriminatedUnion('holderType', [
  z.object({ holderType: z.literal('employee'), employeeId: z.uuid(), ...issueBase }),
  z.object({ holderType: z.literal('department'), departmentId: z.uuid(), ...issueBase }),
  z.object({ holderType: z.literal('company'), ...issueBase }),
]);

/** `assignment` (tuỳ chọn): cấp luôn cho đối tượng đó khi thêm — khi đó trạng thái phải là Trong kho. */
export const createIssuedAssetSchema = z
  .object({
    code: code.default(null),
    name,
    category: z.enum(ISSUED_ASSET_CATEGORIES),
    status: z.enum(EDITABLE_ASSET_STATUSES).default('in_stock'),
    expiresOn: date.nullable().default(null),
    note: note.default(null),
    assignment: issueAssetSchema.nullable().default(null),
  })
  .refine((input) => input.assignment === null || input.status === 'in_stock', {
    message: 'Tài sản cấp luôn khi thêm phải ở trạng thái Trong kho',
    path: ['status'],
  });

export const returnAssetSchema = z.object({ returnedOn: date, note: note.default(null) });

export type ListIssuedAssetsQuery = z.infer<typeof listIssuedAssetsQuerySchema>;
export type CreateIssuedAssetInput = z.infer<typeof createIssuedAssetSchema>;
export type UpdateIssuedAssetInput = z.infer<typeof updateIssuedAssetSchema>;
export type IssueAssetInput = z.infer<typeof issueAssetSchema>;
export type ReturnAssetInput = z.infer<typeof returnAssetSchema>;
