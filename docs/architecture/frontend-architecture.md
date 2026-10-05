# Kiến trúc Frontend

- Cấu trúc thư mục & luật: `rules/architecture-rules.md`, `rules/frontend-rules.md`.
- Router (`app/router.tsx`): `/auth/*` dùng `AuthLayout`; `/app/*` dùng `ProtectedRoute` + `AppLayout`; trang trong `/app` lazy load. `/` → `/app`, `/login` → `/auth/login`.
- Menu: `layouts/nav-items.ts` theo sitemap; mục chưa làm có `ready: false` (hiện mờ, nhãn "Sắp có").
- Dữ liệu: `lib/api-client.ts` (gắn token, chuẩn hoá lỗi — sẽ thêm cùng module đầu tiên) → `features/<m>/api` → hooks React Query.
- Realtime board: subscribe kênh Supabase theo `board_id`, khi có thay đổi → `invalidateQueries(['tasks', boardId])`.
- Style: Tailwind với token màu ở `docs/ui-ux/colors.md`; component dùng chung ở `components/ui`.

## Route chính

| Route                                                                                   | Module                                                           | Trạng thái |
| --------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------- |
| `/auth/login`                                                                           | auth                                                             | ✅         |
| `/app`                                                                                  | overview                                                         | ✅ (khung) |
| `/app/workspace`                                                                        | workspace                                                        | ⏳         |
| `/app/workspace/:dashboardId?task=:taskId`                                              | department-dashboards (task mở dạng drawer)                      | ⏳         |
| `/app/my-tasks`, `/app/projects`, `/app/projects/:id`, `/app/workload`, `/app/overview` | tương ứng                                                        | ⏳         |
| `/app/hrm/*`                                                                            | employees, departments, org-chart, attendance, leave, payroll... | ⏳         |
| `/app/settings/*`                                                                       | settings, users, audit-log                                       | ⏳         |
