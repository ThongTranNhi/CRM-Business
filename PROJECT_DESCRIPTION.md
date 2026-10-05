# CRM-for business — Mô tả dự án

> **Phiên bản:** v1.0 (2026-10-05) — thay bản nháp v0.1 dựa trên giả định.
> Các quyết định ở đây đã được chủ dự án chốt. Bản v0.1 từng mô tả `src/pages`, `services/`, `utils/`, `packages/` — **không còn hiệu lực**.

## 1. Sản phẩm

Web app nội bộ cho **một công ty**, gộp **Work Management** và **HRM** thành "hệ điều hành nội bộ".
"CRM" là tên dự án; hiện **không** có CRM khách hàng (lead, deal).
Desktop là chính; tablet/mobile là phụ. Giao diện tiếng Việt, không i18n.

## 2. Người dùng

CEO/Super Admin · HR Admin · Department Manager · Team Leader · Employee — xem `docs/product/user-roles.md`.

## 3. Phân hệ

- **Work Management:** Workspace, Department Dashboard (Kanban 3 cột), Task, Project, My Tasks, Workload, Executive Overview, Reports.
- **HRM:** Employees, Departments, Org Chart, Attendance, Leave, Payroll, KPI/OKR, Performance Review, Recruitment, Onboarding, Offboarding, Assets, Documents, Approval Workflow.
- **Hệ thống:** Auth, Users, Roles & Permissions, Settings, Notifications, Audit Log, Integrations.

## 4. Luồng cốt lõi (không đổi khi chưa có xác nhận)

Phòng ban được tạo (ở trang Phòng ban hoặc ngay trong hộp thoại Tạo Dashboard) → tồn tại độc lập → người có quyền chọn phòng ban và bấm "Tạo Dashboard" → Dashboard xuất hiện ở Workspace → tạo task, giao 1 người phụ trách chính → VIỆC CẦN LÀM → VIỆC ĐANG LÀM → ĐÃ HOÀN THÀNH.
Quy tắc đầy đủ: `docs/requirements/business-rules.md`. Giao diện tham chiếu: bản demo "CRM Business Demo".

## 5. Công nghệ & hạ tầng

| Lớp      | Lựa chọn                                                                     |
| -------- | ---------------------------------------------------------------------------- |
| Monorepo | pnpm 10.18 + Turborepo                                                       |
| Ngôn ngữ | TypeScript 5.9 strict                                                        |
| Web      | React + Vite + React Query + react-router-dom + Tailwind + zod → **Netlify** |
| API      | Hono + zod + jose → **Cloudflare Workers**                                   |
| Dữ liệu  | **Supabase** Singapore (Postgres + RLS, Auth, Storage, Realtime)             |

Lý do: `docs/decisions/`.

## 6. Cấu trúc thư mục

Bắt buộc theo `rules/architecture-rules.md` (tóm tắt trong `CLAUDE.md`):

- Web: `app/`, `layouts/`, `features/<module>/{api,hooks,components,pages,schemas}`, `components/ui/`, `lib/`, `styles/`.
- API: `config/`, `middleware/`, `lib/`, `modules/<module>/<module>.{routes,controller,service,repository,schema,types}.ts`.
- DB: `supabase/migrations/`, `supabase/seed.sql`.

## 7. Lộ trình

| Giai đoạn          | Nội dung                                                                                        | Trạng thái   |
| ------------------ | ----------------------------------------------------------------------------------------------- | ------------ |
| 0. Nền móng        | Monorepo, khung web (đăng nhập, layout, menu, component UI) + API (health, auth JWT, lỗi chuẩn) | ✅ Xong      |
| 1. Lõi             | Schema users/roles/departments/employees, phân quyền, audit log                                 | ⏳ Tiếp theo |
| 2. Work Management | Workspace, Dashboard, Task, kéo thả, activity, realtime                                         |              |
| 3. Mở rộng work    | My Tasks, Projects, Workload, Overview, Notifications                                           |              |
| 4. HR vận hành     | Attendance, Leave, Approvals, Documents, Assets                                                 |              |
| 5. HR nâng cao     | Payroll, KPI, Performance, Recruitment, On/Offboarding, Reports                                 |              |
| 6. Production      | Bảo mật, hiệu năng, CI/CD, Supabase Pro                                                         |              |

## 8. Câu hỏi còn mở

1. Ma trận quyền chi tiết (bản mặc định ở `docs/architecture/permission-model.md`) — cần xác nhận, đặc biệt: Trưởng phòng có được tạo phòng ban không.
2. Quy tắc tính lương, BHXH, thuế TNCN, OT theo luật Việt Nam.
3. Cách chấm công: nút trên web, GPS, máy chấm công hay import.
4. Có bắt buộc lưu dữ liệu tại Việt Nam không (ảnh hưởng việc dùng Supabase cloud).
