<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->

# AGENTS.md — Quy tắc bắt buộc cho AI agent (Codex, Cursor, Copilot...)

> File này là **luật**. Đọc hết trước khi làm bất kỳ việc gì.
> Chi tiết từng mảng nằm trong `rules/*.md` — đó là nguồn chính thức.
> Mâu thuẫn hoặc thiếu thông tin → **DỪNG và HỎI**, không tự đoán.

## 1. Dự án là gì

Web app nội bộ (HRM + Work Management) cho một công ty. Desktop là chính, tablet/mobile là phụ.
Người dùng: CEO/Super Admin, HR Admin, Department Manager, Team Leader, Employee.
Nghiệp vụ: `docs/product/*`, `docs/requirements/business-rules.md`, `docs/features/<module>/*`.

## 2. Thứ tự đọc trước khi code

1. `CLAUDE.md` (file này)
2. `rules/README.md` → các file `rules/*.md` liên quan
3. `docs/requirements/business-rules.md`
4. `docs/features/<module>/*` của module đang làm
5. `docs/decisions/*` — quyết định đã chốt, KHÔNG làm ngược

Trước khi code, trả lời ngắn: file sẽ tạo/sửa (đường dẫn đầy đủ) + ảnh hưởng DB / API / UI / quyền / audit log. Chờ đồng ý với việc lớn.

## 3. Stack đã chốt — không đổi, không thêm

| Lớp                      | Công nghệ                                                                              |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Monorepo                 | pnpm 10.18 + Turborepo                                                                 |
| Ngôn ngữ                 | TypeScript 5.9 strict, cấm `any`                                                       |
| Web                      | `apps/web`: React + Vite + React Query + react-router-dom + Tailwind CSS → **Netlify** |
| API                      | `apps/api`: Hono → **Cloudflare Workers**                                              |
| DB/Auth/Storage/Realtime | **Supabase** (Postgres + RLS), region Singapore                                        |
| Validation               | zod · Xác thực JWT ở API: jose (JWKS)                                                  |

- MỌI thao tác **ghi** đi qua API Hono. Web chỉ dùng Supabase trực tiếp cho: đăng nhập, upload file, nhận realtime.
- Username đăng ký/đăng nhập qua hai endpoint công khai `/api/auth/register`, `/api/auth/login` có rate limit; các endpoint khác trừ health yêu cầu phiên đăng nhập hợp lệ. Xem `docs/development/username-admin-setup.md`.
- Payroll & dữ liệu nhạy cảm CHỈ đọc qua API.
- Workers không phải Node đầy đủ: cấm thư viện cần `fs`, `net`, `child_process`. Việc nặng (xuất file lớn, PDF hàng loạt) → HỎI.
- Không cài thư viện mới khi chưa hỏi.

## 4. Cấu trúc thư mục — BẮT BUỘC

Không tạo thư mục gốc mới, không đổi tên/di chuyển file có sẵn.
**CẤM** tạo: `pages/` (cấp src), `services/`, `utils/`, `helpers/`, `stores/`, `misc/`, `temp/`, `packages/` (chưa cần).

```
apps/web/src/
├── app/              App, providers, query-client, router — chỉ cấu hình
├── layouts/          AppLayout, AuthLayout, Header, Sidebar, UserMenu, nav-items — chỉ khung
├── features/<module>/
│   ├── api/          gọi API
│   ├── hooks/        React Query hooks
│   ├── components/
│   ├── pages/        trang gắn router
│   ├── schemas/      zod
│   ├── types.ts
│   └── index.ts      public API — nơi khác chỉ import qua đây
├── components/ui/    component dùng chung (Button, Input, Badge, Avatar, Card, EmptyState, Skeleton, Icon)
├── lib/              tiện ích dùng chung (supabase, cn, format-date, api-client)
└── styles/

apps/api/src/
├── index.ts, app.ts  khởi tạo + mount route (không nghiệp vụ)
├── config/           env.ts, constants.ts
├── middleware/       auth, error, permission, request-id (dùng lại)
├── lib/              tiện ích dùng chung (app-env, app-error, supabase, pagination)
└── modules/<module>/
    ├── <module>.routes.ts       route + middleware
    ├── <module>.controller.ts   request → service → response
    ├── <module>.service.ts      TOÀN BỘ nghiệp vụ
    ├── <module>.repository.ts   truy vấn Supabase
    ├── <module>.schema.ts       zod
    └── <module>.types.ts

supabase/migrations/  mỗi thay đổi DB = 1 migration MỚI
supabase/seed.sql
```

Tên module (kebab-case, giống nhau ở web và api): xem `rules/architecture-rules.md`.

## 5. Nghiệp vụ cốt lõi — KHÔNG ĐƯỢC PHÁ

1. Department ≠ Department Dashboard (2 bảng riêng).
2. Tạo phòng ban KHÔNG tự tạo Dashboard.
3. Workspace chỉ hiện Dashboard đã tạo.
4. Mỗi phòng ban tối đa 1 Dashboard chính — đã có thì mở, không tạo trùng.
5. Board mặc định 3 cột: VIỆC CẦN LÀM | VIỆC ĐANG LÀM | ĐÃ HOÀN THÀNH.
6. Task tạo trong Dashboard tự gán department của Dashboard.
7. Mỗi Task có ĐÚNG 1 người phụ trách chính, nhiều người phối hợp.
8. Kéo thả lưu DB; sang "Đã hoàn thành" ghi `completed_at` + `completed_by`.
9. Activity log không bị xoá.
10. Quyền kiểm tra ở BACKEND; ẩn nút trên UI chỉ là phụ.

## 6. Code sạch & hiệu năng (tóm tắt — chi tiết ở rules/)

- 1 file 1 trách nhiệm; component > ~200 dòng / function > ~40 dòng → tách.
- Tìm & dùng lại trước khi viết mới. Không code chết, console.log, TODO vô chủ.
- Không hard-code dữ liệu nghiệp vụ; không hex màu trong component (dùng token Tailwind — ESLint chặn).
- Kéo thả dùng optimistic update. Không N+1. Không `select *`. Danh sách lớn phải phân trang. Lazy load theo route.

## 7. Hoàn thành công việc

- Chạy `pnpm lint`, `pnpm typecheck` (và test khi có). Còn lỗi → KHÔNG báo xong.
- Đổi API/DB → cập nhật `docs/api/endpoints/*`, `docs/database/*`.
- Commit theo `rules/git-rules.md`.
- Báo cáo: file đã tạo/sửa · migration · endpoint · docs cập nhật · việc còn lại/rủi ro.

**Yêu cầu nào buộc phải làm khác các quy tắc trên → DỪNG và HỎI.**

> Nội dung giống `CLAUDE.md`. Khi sửa quy tắc, sửa `rules/*.md` (nguồn chính) rồi cập nhật cả hai file.
