import type { Role } from '../../config/constants';
import type { z } from 'zod';
import type {
  adminEmployeeSchema,
  directoryQuerySchema,
  profileUpdateSchema,
} from './users.schema';

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
export type AdminEmployeeUpdate = z.infer<typeof adminEmployeeSchema>;
export type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

export interface Profile {
  id: string;
  fullName: string;
  employeeCode: string | null;
  jobTitle: string | null;
  departmentName: string | null;
  managerName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
}

export interface DirectoryEmployee extends Profile {
  departmentId: string | null;
  username: string | null;
  role: string | null;
  status: string | null;
  archivedAt: string | null;
  /** Phòng mà người này đang là trưởng phòng (để cảnh báo khi xoá / chuyển phòng). */
  managedDepartment: { id: string; name: string } | null;
}

export interface EmployeeOption {
  id: string;
  fullName: string;
  jobTitle: string | null;
  departmentName: string | null;
  /** Role tài khoản; null nếu chưa có tài khoản. Form chọn trưởng phòng cảnh báo khi chưa phải Trưởng phòng. */
  role: Role | null;
}

/** Ảnh chỉ được ký URL khi nằm trong thư mục UUID của chính chủ tài khoản. */
export interface AvatarOwner {
  id: string;
  authUserId: string | null;
  avatarPath: string | null;
}
