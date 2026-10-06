# Quy tắc kiến trúc

## 1. Monorepo

```
apps/web   React + Vite (Netlify)
apps/api   Hono (Cloudflare Workers)
supabase/  migrations, seed, config
docs/  rules/  scripts/  .github/
```

- KHÔNG tạo thư mục gốc mới. KHÔNG tạo `packages/` cho đến khi có code thật sự dùng chung giữa web và api (phải hỏi trước).
- KHÔNG tạo `infrastructure/`, `tests/` ở gốc khi chưa được duyệt.

## 2. apps/web/src

```
app/                 cấu hình: App, providers, query-client, router
layouts/             AppLayout, AuthLayout, Header, Sidebar, UserMenu, nav-items
features/<module>/   api/ hooks/ components/ pages/ schemas/ types.ts index.ts
components/ui/       Button, Input, Badge, Avatar, Card, EmptyState, Skeleton, Icon...
lib/                 supabase.ts, cn.ts, format-date.ts, api-client.ts...
styles/              global.css
```

- Trang luôn nằm trong `features/<module>/pages/`. CẤM `src/pages/`.
- CẤM `src/services/`, `src/utils/`, `src/hooks/` (cấp src), `src/stores/`, `src/constants/`, `src/types/`.
  Hook dùng chung toàn app (hiếm) → `lib/`. Hằng số → trong module hoặc `lib/constants.ts`.
- Feature A KHÔNG import sâu vào feature B. Chỉ import qua `features/B/index.ts`.
- `components/ui/` không chứa nghiệp vụ, không gọi API.
- Icon: thêm vào `components/ui/Icon.tsx`, không cài thư viện icon.

## 3. apps/api/src

```
index.ts  app.ts
config/       env.ts, constants.ts
middleware/   request-id, auth, permission, error
lib/          app-env.ts, app-error.ts, supabase.ts, pagination.ts...
modules/<module>/  .routes .controller .service .repository .schema .types
```

- CẤM `routes/`, `services/`, `utils/`, `database/`, `types/` ở cấp `src/`.
- Luồng một request: `request-id → auth → permission → controller → service → repository → error`.
- Module A cần dữ liệu module B → gọi **service** của B, không gọi repository của B.
- Module lớn (một lớp vượt ~200 dòng) tách theo phần: `<module>.<phần>.<lớp>.ts`, vd.
  `tasks.checklist.service.ts`, `tasks.comments.repository.ts`. Vẫn chung một `<module>.routes.ts`.
- Hàm thuần dùng chung giữa các module (không gọi DB) đặt ở `lib/`, vd. `lib/work-access.ts`.

## 4. Danh sách module (kebab-case, web và api dùng cùng tên)

| Nhóm     | Module                                                                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hệ thống | auth, users, settings, audit-log, notifications                                                                                                     |
| Work     | workspace, department-dashboards, tasks, projects, my-tasks, workload, overview, reports                                                            |
| HRM      | employees, departments, org-chart, attendance, leave, payroll, kpi, performance, recruitment, onboarding, offboarding, assets, documents, approvals |

Không phải module nào cũng có cả web lẫn api (ví dụ `my-tasks` chỉ ở web, dùng API của `tasks`).
Module mới ngoài danh sách → HỎI.

## 5. Nguyên tắc chung

- Backend/DB là nguồn sự thật. UI không tự tính quyền hay trạng thái nghiệp vụ.
- Không hard-code dữ liệu động (phòng ban, role, loại nghỉ phép...).
- Tham chiếu bằng id (`department_id`), không lưu tên.
