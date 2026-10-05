export interface OwnProfile {
  id: string;
  fullName: string;
  employeeCode: string | null;
  jobTitle: string | null;
  departmentName: string | null;
  managerName: string | null;
  avatarPath: string | null;
  avatarUrl: string | null;
}

export interface ProfileUpdate {
  employeeCode: string | null;
  avatarPath?: string | null;
}
export interface DirectoryEmployee extends OwnProfile {
  departmentId: string | null;
  username: string | null;
  role: string | null;
  status: string | null;
}
export interface DirectoryPage {
  data: DirectoryEmployee[];
  meta: { page: number; pageSize: number; hasMore: boolean };
}
export interface AdminEmployeeUpdate {
  fullName: string;
  jobTitle: string | null;
  departmentId: string | null;
  status: 'active' | 'disabled';
}
