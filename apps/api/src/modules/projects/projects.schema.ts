import { z } from 'zod';
import { paginationSchema, searchSchema } from '../../lib/pagination';

export const uuidSchema = z.uuid();

export const PROJECT_STATUSES = ['planning', 'active', 'on_hold', 'done'] as const;
const MAX_MEMBERS = 50;

const name = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên dự án')
  .max(120, 'Tên dự án tối đa 120 ký tự');
const description = z.string().trim().max(2000, 'Mô tả dự án tối đa 2000 ký tự');
const date = z.iso.date('Ngày không hợp lệ');
const memberIds = z.array(z.uuid()).max(MAX_MEMBERS, `Tối đa ${MAX_MEMBERS} thành viên`);

const dateRangeIsValid = (input: { startDate?: string | null; dueDate?: string | null }) =>
  !input.startDate || !input.dueDate || input.startDate <= input.dueDate;
const DATE_RANGE_ERROR = { message: 'Hạn không được trước ngày bắt đầu', path: ['dueDate'] };

/** `status=archived`: dự án đã lưu trữ (để khôi phục); bỏ trống = mọi dự án chưa lưu trữ. */
export const listProjectsQuerySchema = paginationSchema.extend({
  departmentId: z.uuid().optional(),
  status: z.enum([...PROJECT_STATUSES, 'archived']).optional(),
  q: searchSchema,
});

export const createProjectSchema = z
  .object({
    departmentId: z.uuid(),
    name,
    description: description.nullable().default(null),
    ownerEmployeeId: z.uuid().nullable().default(null),
    status: z.enum(PROJECT_STATUSES).default('planning'),
    startDate: date.nullable().default(null),
    dueDate: date.nullable().default(null),
    memberIds: memberIds.default([]),
  })
  .strict()
  .refine(dateRangeIsValid, DATE_RANGE_ERROR);

/** PATCH: chỉ khoá có mặt mới đổi; null = xoá giá trị (trừ name, status). Không đổi phòng ban. */
export const updateProjectSchema = z
  .object({
    name: name.optional(),
    description: description.nullable().optional(),
    ownerEmployeeId: z.uuid().nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    startDate: date.nullable().optional(),
    dueDate: date.nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, { message: 'Không có thay đổi nào' })
  .refine(dateRangeIsValid, DATE_RANGE_ERROR);

export const projectMembersSchema = z.object({ employeeIds: memberIds }).strict();

export const eligibleMembersQuerySchema = z.object({ departmentId: z.uuid() });

/** Công việc / lịch sử của dự án: `?page=&pageSize=`. */
export const projectFeedQuerySchema = paginationSchema;

/** old_values / new_values của audit dự án; khoá lạ bỏ qua. */
export const projectAuditValueSchema = z
  .object({
    name: z.string().optional(),
    description: z.string().nullable().optional(),
    ownerEmployeeId: z.uuid().nullable().optional(),
    status: z.enum(PROJECT_STATUSES).optional(),
    startDate: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
    employeeIds: z.array(z.uuid()).optional(),
    taskId: z.uuid().optional(),
    title: z.string().optional(),
  })
  .nullable();
