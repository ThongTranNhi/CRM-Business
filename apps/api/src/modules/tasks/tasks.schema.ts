import { z } from 'zod';
import { paginationSchema, searchSchema } from '../../lib/pagination';

export const uuidSchema = z.uuid();

const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;
const MAX_COLLABORATORS = 20;

/** BR-17 → BR-18 và task-management.md. Ngày dạng YYYY-MM-DD (giờ Việt Nam do giao diện chọn). */
const title = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập tên công việc')
  .max(200, 'Tên công việc tối đa 200 ký tự');
const description = z.string().trim().max(5000, 'Mô tả tối đa 5000 ký tự');
const date = z.iso.date('Ngày không hợp lệ');
const assigneeId = z.uuid('Mỗi công việc cần đúng một người phụ trách chính');
const collaboratorIds = z
  .array(z.uuid())
  .max(MAX_COLLABORATORS, `Tối đa ${MAX_COLLABORATORS} người phối hợp`);

const dateRangeIsValid = (input: { startDate?: string | null; dueDate?: string | null }) =>
  !input.startDate || !input.dueDate || input.startDate <= input.dueDate;
const DATE_RANGE_ERROR = { message: 'Hạn không được trước ngày bắt đầu', path: ['dueDate'] };

/** `doneLimit`: số việc Đã hoàn thành trả về ([Xem thêm] tăng 20, tối đa 200 — Q7). */
export const boardQuerySchema = z.object({
  doneLimit: z.coerce.number().int().min(20).max(200).default(20),
});

/** Tab của trang Việc của tôi (Đợt 3 S2). */
export const MY_TASK_TABS = ['today', 'week', 'overdue', 'open', 'done'] as const;

/** `GET /api/tasks/mine?tab=&departmentId=&priority=&projectId=&q=&page=&pageSize=`. */
export const myTasksQuerySchema = paginationSchema.extend({
  tab: z.enum(MY_TASK_TABS).default('open'),
  departmentId: z.uuid().optional(),
  priority: z.enum(PRIORITIES).optional(),
  projectId: z.uuid().optional(),
  q: searchSchema,
});

/** Thùng rác: `?page=&pageSize=&q=` (q tìm theo tên việc). */
export const trashQuerySchema = paginationSchema.extend({ q: searchSchema });

export const createTaskSchema = z
  .object({
    title,
    assigneeId,
    collaboratorIds: collaboratorIds.default([]),
    priority: z.enum(PRIORITIES).default('normal'),
    startDate: date.nullable().default(null),
    dueDate: date.nullable().default(null),
    description: description.nullable().default(null),
    /** BR-30: dự án cùng phòng với Dashboard (RPC kiểm tra). */
    projectId: z.uuid().nullable().default(null),
  })
  .strict()
  .refine(dateRangeIsValid, DATE_RANGE_ERROR);

/** PATCH: chỉ khoá có mặt mới đổi; null = xoá giá trị (trừ title, assigneeId, priority). */
export const updateTaskSchema = z
  .object({
    title: title.optional(),
    assigneeId: assigneeId.optional(),
    priority: z.enum(PRIORITIES).optional(),
    startDate: date.nullable().optional(),
    dueDate: date.nullable().optional(),
    description: description.nullable().optional(),
    /** null = bỏ khỏi dự án. */
    projectId: z.uuid().nullable().optional(),
  })
  .strict()
  .refine((input) => Object.keys(input).length > 0, { message: 'Không có thay đổi nào' })
  .refine(dateRangeIsValid, DATE_RANGE_ERROR);

/** previousTaskId: task ngay trên chỗ thả; nextTaskId: task ngay dưới (drag-and-drop.md). */
export const moveTaskSchema = z
  .object({
    toColumnId: z.uuid(),
    previousTaskId: z.uuid().nullable().default(null),
    nextTaskId: z.uuid().nullable().default(null),
  })
  .strict();

export const collaboratorsSchema = z.object({ employeeIds: collaboratorIds }).strict();

/** Kết quả RPC crm_move_task. */
export const movedTaskSchema = z.object({
  id: z.uuid(),
  columnId: z.uuid(),
  status: z.enum(['todo', 'in_progress', 'done']),
  position: z.coerce.number(),
  startedAt: z.string().nullable(),
  completedAt: z.string().nullable(),
  completedBy: z.uuid().nullable(),
});

// ---------- Checklist, bình luận, lịch sử (drawer chi tiết task) ----------

/** BR-17; khớp check task_checklist_items_content_check (1 → 500 ký tự, đã trim). */
const checklistContent = z
  .string()
  .trim()
  .min(1, 'Vui lòng nhập nội dung')
  .max(500, 'Mục checklist tối đa 500 ký tự');

export const addChecklistItemSchema = z.object({ content: checklistContent }).strict();

export const updateChecklistItemSchema = z
  .object({ content: checklistContent.optional(), isDone: z.boolean().optional() })
  .strict()
  .refine((input) => input.content !== undefined || input.isDone !== undefined, {
    message: 'Không có thay đổi nào',
  });

/** Khớp check task_comments_body_check (1 → 5000 ký tự). parentId: trả lời 1 cấp. */
export const addCommentSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Vui lòng nhập bình luận')
      .max(5000, 'Bình luận tối đa 5000 ký tự'),
    parentId: z.uuid().nullable().default(null),
  })
  .strict();

/** Bình luận gốc và lịch sử: `?page=&pageSize=`, mới nhất trước. */
export const feedQuerySchema = paginationSchema;

/** from_value / to_value của task_activities (activity-log.md); khoá lạ bỏ qua. */
export const activityValueSchema = z
  .object({
    title: z.string().optional(),
    assigneeId: z.uuid().optional(),
    employeeIds: z.array(z.uuid()).optional(),
    priority: z.enum(PRIORITIES).optional(),
    dueDate: z.string().nullable().optional(),
    columnName: z.string().optional(),
    content: z.string().optional(),
    isDone: z.boolean().optional(),
    projectId: z.uuid().optional(),
    projectName: z.string().optional(),
  })
  .nullable();
