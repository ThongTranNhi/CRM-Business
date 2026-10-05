# Tổng quan sản phẩm

Web app chạy trên trình duyệt, ưu tiên desktop/laptop. Giao diện: Sidebar trái, Header trên, vùng nội dung.

## Phân hệ

| Nhóm            | Phân hệ                                                                                                                                                                |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Work Management | Workspace, Department Dashboard (Kanban), Task, Project, My Tasks, Workload, Executive Overview, Reports                                                               |
| HRM             | Employees, Departments, Org Chart, Attendance, Leave, Payroll, KPI/OKR, Performance Review, Recruitment, Onboarding, Offboarding, Assets, Documents, Approval Workflow |
| Hệ thống        | Đăng nhập, Hồ sơ cá nhân, Roles & Permissions, Users, Company Settings, Audit Log, Notifications, Integrations                                                         |

## Cấu trúc công việc

```
Company → Department → Department Dashboard → Project → Task → Checklist
```

## Thứ tự xây dựng (MVP trước)

1. Nền móng: auth, layout, phân quyền, audit log
2. Departments, Employees
3. Workspace, Department Dashboard, Task, kéo thả, activity log
4. My Tasks, Projects, Workload, Executive Overview, Notifications
5. Attendance, Leave, Approvals, Documents, Assets
6. Payroll, KPI, Performance, Recruitment, Onboarding/Offboarding, Reports
