// GET /api/search — kết quả nhóm theo loại, tối đa 5 mỗi nhóm (frontend-spec 3.2).

export interface TaskResult {
  id: string;
  title: string;
  status: 'todo' | 'in_progress' | 'done';
  /** Mở task: /app/workspace/:dashboardId?task=:id. */
  dashboardId: string;
  dashboardName: string;
}

export interface EmployeeResult {
  id: string;
  fullName: string;
  jobTitle: string | null;
  departmentName: string | null;
}

export interface ProjectResult {
  id: string;
  name: string;
  departmentName: string;
}

export interface DepartmentResult {
  id: string;
  name: string;
}

export interface SearchResults {
  tasks: TaskResult[];
  employees: EmployeeResult[];
  projects: ProjectResult[];
  departments: DepartmentResult[];
}
