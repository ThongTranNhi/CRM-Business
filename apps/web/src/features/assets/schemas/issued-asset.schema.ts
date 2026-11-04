import { z } from 'zod';
import { ASSET_HOLDER_TYPES, EDITABLE_ASSET_STATUSES, ISSUED_ASSET_CATEGORIES } from '../types';

const note = z.string().trim().max(2000, 'Ghi chú tối đa 2000 ký tự');

/** Form thêm / sửa tài sản. '' ở ô ngày / ô ghi chú = để trống. */
export const issuedAssetFormSchema = z.object({
  code: z.string().trim().max(40, 'Mã tối đa 40 ký tự'),
  name: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập tên tài sản')
    .max(120, 'Tên tài sản tối đa 120 ký tự'),
  category: z.enum(ISSUED_ASSET_CATEGORIES),
  status: z.enum(EDITABLE_ASSET_STATUSES),
  expiresOn: z.string(),
  note,
});

export type IssuedAssetForm = z.infer<typeof issuedAssetFormSchema>;
export type IssuedAssetFormErrors = Partial<Record<keyof IssuedAssetForm, string>>;

/** Form [Cấp]: người / phòng chỉ bắt buộc khi đúng loại đối tượng. */
export const issueFormSchema = z
  .object({
    holderType: z.enum(ASSET_HOLDER_TYPES),
    employeeId: z.string(),
    departmentId: z.string(),
    issuerEmployeeId: z.string().min(1, 'Vui lòng chọn người cấp'),
    issuedOn: z.iso.date('Vui lòng chọn ngày cấp'),
    note,
  })
  .refine((form) => form.holderType !== 'employee' || form.employeeId !== '', {
    message: 'Vui lòng chọn nhân viên sử dụng',
    path: ['employeeId'],
  })
  .refine((form) => form.holderType !== 'department' || form.departmentId !== '', {
    message: 'Vui lòng chọn phòng ban sử dụng',
    path: ['departmentId'],
  });

export type IssueForm = z.infer<typeof issueFormSchema>;
export type IssueFormErrors = Partial<Record<keyof IssueForm, string>>;
