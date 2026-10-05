import type { z } from 'zod';
import type { profileUpdateSchema } from './users.schema';
import type { adminEmployeeSchema } from './users.schema';

export type ProfileUpdate = z.infer<typeof profileUpdateSchema>;
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
export type AdminEmployeeUpdate = z.infer<typeof adminEmployeeSchema>;
export interface DirectoryEmployee extends Profile {
  departmentId: string | null;
  username: string | null;
  role: string | null;
  status: string | null;
}
