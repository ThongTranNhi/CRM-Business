import type { z } from 'zod';
import type {
  addMemberSchema,
  createDepartmentSchema,
  listDepartmentsQuerySchema,
  updateDepartmentSchema,
} from './departments.schema';

export type ListDepartmentsQuery = z.infer<typeof listDepartmentsQuerySchema>;
export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;

export interface PersonRef {
  id: string;
  fullName: string;
}

export interface DepartmentListItem {
  id: string;
  name: string;
  manager: PersonRef | null;
  memberCount: number;
  archivedAt: string | null;
}

export interface DepartmentMember {
  id: string;
  fullName: string;
  jobTitle: string | null;
  avatarUrl: string | null;
  isManager: boolean;
}

export interface DepartmentDetail extends DepartmentListItem {
  members: DepartmentMember[];
}
