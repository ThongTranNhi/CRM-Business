# CRM-Business: Mô tả dự án

> **Trạng thái tài liệu:** Bản nháp v0.1 (2026-10-02)
>
> **Lưu ý quan trọng:** Toàn bộ 161 file trong repo hiện đang trống (0 byte). Tài liệu này được **suy ra từ cấu trúc thư mục, tên file và tên các ADR**, không phải từ nội dung có sẵn. Những chỗ đánh dấu **[Giả định]** cần chủ dự án xác nhận. Danh sách câu hỏi cần chốt nằm ở mục 11.

---

## 1. Tổng quan

**CRM-Business** là một nền tảng web nội bộ cho doanh nghiệp, gom hai nhóm nghiệp vụ vào một hệ thống:

1. **Quản trị nhân sự (HRM):** hồ sơ nhân viên, phòng ban, chấm công, nghỉ phép, tính lương, KPI, đánh giá hiệu suất, tuyển dụng, onboarding và offboarding.
2. **Quản lý công việc (Work Management):** workspace, board, dự án, task, kéo thả, nhật ký hoạt động, dashboard theo phòng ban.

Ngoài ra còn các phân hệ hỗ trợ dùng chung: phê duyệt, tài sản, tài liệu, thông báo, audit log và báo cáo.

> **[Giả định]** Dù tên là "CRM", phạm vi hiện tại thiên về quản trị nội bộ (HR và công việc). Cấu trúc thư mục chưa có module khách hàng, lead, cơ hội bán hàng hay hợp đồng.

## 2. Mục tiêu sản phẩm [Giả định]

- Một nguồn dữ liệu duy nhất về nhân sự và tổ chức.
- Số hóa các quy trình có phê duyệt (nghỉ phép, tài sản, chi phí...).
- Theo dõi công việc và hiệu suất theo cá nhân, phòng ban và dự án.
- Phân quyền chặt theo vai trò, có audit log cho dữ liệu nhạy cảm như lương và hồ sơ cá nhân.
- Chạy serverless, chi phí vận hành thấp (Cloudflare kết hợp Supabase).

## 3. Đối tượng người dùng [Giả định]

| Vai trò | Mô tả |
|---|---|
| **Super Admin / Admin** | Cấu hình hệ thống, quản lý người dùng và phân quyền |
| **HR** | Quản lý hồ sơ, tuyển dụng, chấm công, nghỉ phép, lương |
| **Manager / Trưởng phòng** | Duyệt yêu cầu, giao việc, theo dõi KPI và dashboard của phòng |
| **Employee** | Xem hồ sơ cá nhân, chấm công, xin nghỉ, làm task, xem phiếu lương |
| **Accountant** *(tùy chọn)* | Xử lý bảng lương |

Định nghĩa chính thức sẽ nằm ở `docs/product/user-roles.md` và `docs/architecture/permission-model.md`.

## 4. Danh sách phân hệ

| # | Phân hệ | API (`apps/api/src/modules`) | Web (`features` / `pages`) | Chức năng chính [Giả định] |
|---|---|:-:|:-:|---|
| 1 | **Auth** | ✅ | ✅ / – | Đăng nhập, phiên làm việc, quên mật khẩu (Supabase Auth) |
| 2 | **Users** | ✅ | – / settings | Tài khoản, vai trò, quyền |
| 3 | **Employees** | ✅ | ✅ / ✅ | Hồ sơ nhân viên, hợp đồng, lịch sử công tác |
| 4 | **Departments** | ✅ | ✅ / ✅ | Cơ cấu tổ chức, sơ đồ phòng ban |
| 5 | **Attendance** | ✅ | ✅ / ✅ | Chấm công vào/ra, bảng công, đi muộn/về sớm |
| 6 | **Leave** | ✅ | ✅ / ✅ | Đơn nghỉ phép, số ngày phép, duyệt đơn |
| 7 | **Payroll** | ✅ | ✅ / ✅ | Tính lương, phụ cấp, khấu trừ, phiếu lương |
| 8 | **KPI** | ✅ | ✅ / ✅ | Thiết lập và đo lường chỉ tiêu |
| 9 | **Performance** | ✅ | ❌ / ❌ | Đánh giá hiệu suất định kỳ |
| 10 | **Recruitment** | ✅ | ✅ / ✅ | Tin tuyển dụng, ứng viên, pipeline phỏng vấn |
| 11 | **Onboarding** | ✅ | ❌ / ❌ | Checklist nhận người mới |
| 12 | **Offboarding** | ✅ | ❌ / ❌ | Checklist nghỉ việc, thu hồi tài sản |
| 13 | **Projects** | ✅ | ✅ / ✅ | Dự án, thành viên, tiến độ |
| 14 | **Tasks** | ✅ | ✅ / my-tasks | Công việc, giao việc, deadline, trạng thái |
| 15 | **Boards** | ✅ | ✅ / work-management | Board dạng Kanban, kéo thả |
| 16 | **Workspace** | ❌ | ✅ / – | Không gian làm việc chứa board và dự án |
| 17 | **Approvals** | ✅ | ✅ / – | Luồng phê duyệt dùng chung cho các phân hệ |
| 18 | **Assets** | ✅ | ✅ / – | Cấp phát và thu hồi tài sản công ty |
| 19 | **Documents** | ✅ | ✅ / ✅ | Lưu trữ tài liệu, phân quyền file |
| 20 | **Notifications** | ✅ | ✅ / – | Thông báo trong ứng dụng, realtime |
| 21 | **Audit** | ✅ | ❌ / – | Nhật ký thao tác trên dữ liệu nhạy cảm |
| 22 | **Dashboards** | ✅ | ❌ / dashboard | Dashboard tổng quan và theo phòng ban |
| 23 | **Reports** | ❌ | – / ✅ | Báo cáo tổng hợp |

**Riêng Work Management** đã có sẵn tên tài liệu chi tiết trong `docs/features/work-management/`: `workspace`, `task-management`, `drag-and-drop`, `activity-log`, `department-dashboard`. Đây có vẻ là phân hệ được ưu tiên.

## 5. Công nghệ sử dụng

| Lớp | Công nghệ | Căn cứ |
|---|---|---|
| Ngôn ngữ | **TypeScript** | ADR 001, `tsconfig.base.json` |
| Frontend | **React + Vite** | ADR 002, `vite.config.ts` |
| Data fetching | **TanStack Query** [Giả định] | `app/query-client.ts` |
| State | Store phía client (Zustand?) [Giả định] | `src/stores/` |
| Backend | **Hono** trên **Cloudflare Workers** | ADR 003, `wrangler.toml` |
| Database / Auth / Storage / Realtime | **Supabase** (PostgreSQL + RLS) | ADR 004, `supabase/` |
| Tổ chức code | **Chia theo tính năng (feature-based)** | ADR 005 |
| Monorepo | **pnpm workspaces + Turborepo** | `pnpm-workspace.yaml`, `turbo.json` |
| Validation | Zod [Giả định], đặt ở `packages/validation` | Tên package |
| Chất lượng code | ESLint (flat config), Prettier, EditorConfig | File cấu hình ở thư mục gốc |
| CI/CD | GitHub Actions: `ci`, `deploy-api`, `deploy-web` | `.github/workflows/` |
| Hosting | Cloudflare Workers (API), Cloudflare Pages [Giả định] (Web) | `docs/deployment/cloudflare.md` |

## 6. Kiến trúc hệ thống

```
┌──────────────────────┐      HTTPS/JSON      ┌───────────────────────────┐
│  apps/web            │ ───────────────────▶ │  apps/api                 │
│  React + Vite (SPA)  │                      │  Hono @ Cloudflare Workers│
│  Cloudflare Pages    │ ◀── Realtime ──┐     │  middleware: request-id → │
└──────────────────────┘                │     │  auth → permission → error│
          │                             │     └─────────────┬─────────────┘
          │ Supabase Auth (JWT)         │                   │ supabase-js / SQL
          ▼                             │                   ▼
┌───────────────────────────────────────┴───────────────────────────────────┐
│  Supabase: PostgreSQL (+ RLS policies) · Auth · Storage · Realtime        │
└───────────────────────────────────────────────────────────────────────────┘
```

**Luồng xử lý một request ở API:**
`request-id` → `auth` (xác thực JWT của Supabase) → `permission` (kiểm tra vai trò hoặc quyền) → handler của module → `error` (chuẩn hóa định dạng lỗi).

**Bảo mật nhiều lớp:** kiểm tra quyền ở API (middleware), cộng thêm RLS ở database (`supabase/policies`). Audit log ghi lại các thao tác nhạy cảm.

## 7. Cấu trúc thư mục

```
CRM-Business/
├── apps/
│   ├── api/                    # Backend Hono (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── index.ts        # Entry cho Worker
│   │   │   ├── app.ts          # Khởi tạo Hono app, đăng ký route
│   │   │   ├── config/         # env.ts, constants.ts
│   │   │   ├── middleware/     # auth, permission, error, request-id
│   │   │   ├── modules/<name>/ # 21 module nghiệp vụ
│   │   │   ├── database/       # Supabase client, truy vấn
│   │   │   ├── services/       # Dịch vụ dùng chung (email, storage...)
│   │   │   ├── types/  utils/
│   │   └── wrangler.toml
│   └── web/                    # Frontend React + Vite
│       ├── public/             # favicon, logo, images
│       └── src/
│           ├── app/            # App, providers, router, query-client
│           ├── layouts/        # AppLayout, AuthLayout, Header, Sidebar
│           ├── pages/          # Trang theo route (14 trang)
│           ├── features/<name>/# Logic + UI theo tính năng (16 feature)
│           ├── components/     # ui/, common/, forms/
│           ├── hooks/ services/ stores/ styles/ types/ utils/ constants/
├── packages/                   # Code dùng chung giữa web và api
│   ├── config/  constants/  types/  ui/  validation/
├── supabase/                   # config.toml, migrations/, policies/, seeds/
├── infrastructure/             # cloudflare/, environments/{development,staging,production}, scripts/
├── tests/                      # e2e/, integration/, fixtures/
├── scripts/                    # setup, dev, build, lint, test, seed, generate-types (.sh)
├── docs/                       # Tài liệu (xem mục 8)
├── rules/                      # Quy tắc phát triển (bản đầy đủ)
├── .claude/rules/ .cursor/rules/  # Quy tắc rút gọn cho AI agent
├── .github/                    # CI/CD, mẫu issue/PR, CODEOWNERS
└── CLAUDE.md, AGENTS.md, ARCHITECTURE.md, README.md, CONTRIBUTING.md, SECURITY.md, CHANGELOG.md
```

## 8. Hệ thống tài liệu (`docs/`)

| Thư mục | Nội dung |
|---|---|
| `product/` | Tầm nhìn, mục tiêu, tổng quan sản phẩm, vai trò người dùng, thuật ngữ |
| `requirements/` | Yêu cầu chức năng, yêu cầu phi chức năng, quy tắc nghiệp vụ, tiêu chí nghiệm thu |
| `architecture/` | Kiến trúc hệ thống, frontend, backend, database, auth, realtime, deploy, mô hình phân quyền |
| `database/` | Schema, quan hệ thực thể, RLS, hướng dẫn migration, chính sách lưu trữ dữ liệu |
| `api/` | Tổng quan API, xác thực, lỗi, phân trang, endpoints (hiện mới có `dashboards.md`) |
| `security/` | Tổng quan bảo mật, authN/authZ, audit log, bảo mật file, dữ liệu nhạy cảm |
| `ui-ux/` | Design system, màu sắc, typography, spacing, component, layout, responsive, accessibility |
| `features/` | Đặc tả từng tính năng (8 phân hệ) |
| `deployment/` | CI/CD, Cloudflare, Supabase, môi trường, checklist production, rollback |
| `development/` | Bắt đầu dự án, chạy local, coding standards, git workflow, branching, testing, debugging |
| `decisions/` | ADR 001–005 |
| `changelog/` | Changelog, lịch sử migration |

## 9. Môi trường và triển khai

- **Môi trường:** `development`, `staging`, `production` (`infrastructure/environments/`).
- **CI:** lint, typecheck, test cho mỗi PR (`ci.yml`).
- **CD:** tách riêng `deploy-api.yml` (Wrangler lên Workers) và `deploy-web.yml` (lên Pages) [Giả định].
- **Database:** migration thông qua Supabase CLI. `scripts/generate-types.sh` sinh TypeScript types từ schema.

## 10. Hiện trạng

| Hạng mục | Trạng thái |
|---|---|
| Cấu trúc thư mục | ✅ Đã có khung |
| Nội dung file (code, cấu hình, tài liệu) | ❌ Toàn bộ 161 file đang trống |
| Git | ❌ Chưa `git init` |
| Dependencies | ❌ `package.json` trống, chưa cài đặt gì |

**Các điểm chưa nhất quán cần xử lý:**
- API có `performance`, `onboarding`, `offboarding`, `audit`, `dashboards`, `users`, nhưng web chưa có feature tương ứng.
- Web có `workspace`, nhưng API chưa có module tương ứng.
- Web có trang `reports`, nhưng API chưa có module `reports`.
- `docs/features/` mới có 8 phân hệ, `docs/api/endpoints/` mới có 1 file.
- Quy tắc bị lặp ở 3 nơi (`rules/`, `.claude/rules/`, `.cursor/rules/`). Nên chọn `rules/` làm nguồn chính, hai nơi còn lại chỉ tham chiếu tới.
- Tên "CRM" chưa khớp với phạm vi hiện tại (chủ yếu là HR và quản lý công việc).

## 11. Câu hỏi cần chủ dự án xác nhận

1. Có cần module **CRM thực thụ** (khách hàng, lead, deal, hợp đồng) không, hay "CRM" chỉ là tên dự án?
2. Danh sách **vai trò** và ma trận quyền chính xác là gì?
3. Hệ thống phục vụ **một công ty** hay **nhiều công ty (multi-tenant)**?
4. Quy tắc **tính lương và chấm công** theo luật Việt Nam (BHXH, thuế TNCN, OT)?
5. **Phân hệ ưu tiên** cho MVP là gì? (gợi ý: Auth, Employees, Departments, Work Management)
6. Ngôn ngữ giao diện: chỉ tiếng Việt, hay cần đa ngôn ngữ (i18n)?
7. Chấm công bằng cách nào: nút bấm trên web, GPS, máy chấm công, hay import file?

## 12. Lộ trình đề xuất

| Giai đoạn | Nội dung |
|---|---|
| **0. Nền móng** | `git init`; cấu hình monorepo (pnpm, turbo, tsconfig, eslint, prettier); khung Vite + Hono chạy được; Supabase local; CI cơ bản |
| **1. Lõi hệ thống** | Auth, Users và phân quyền, Departments, Employees, Audit log, layout ứng dụng |
| **2. Work Management** | Workspace, Boards, Projects, Tasks, kéo thả, activity log, dashboard phòng ban, notifications realtime |
| **3. HR vận hành** | Attendance, Leave, Approvals (luồng phê duyệt dùng chung), Documents, Assets |
| **4. HR nâng cao** | Payroll, KPI, Performance, Recruitment, Onboarding/Offboarding, Reports |
| **5. Production** | Kiểm tra bảo mật, hiệu năng, e2e test, staging, checklist production |
