// GET /api/search (docs/api/endpoints/search.md).

export interface SearchResults {
  tasks: {
    id: string;
    title: string;
    status: string;
    dashboardId: string;
    dashboardName: string;
  }[];
  employees: {
    id: string;
    fullName: string;
    jobTitle: string | null;
    departmentName: string | null;
  }[];
  projects: { id: string; name: string; departmentName: string }[];
  departments: { id: string; name: string }[];
}

/** Một dòng trong dropdown: bấm → đi tới `href`. */
export interface SearchHit {
  key: string;
  href: string;
  title: string;
  detail: string | null;
}

export interface SearchGroup {
  label: string;
  hits: SearchHit[];
}
