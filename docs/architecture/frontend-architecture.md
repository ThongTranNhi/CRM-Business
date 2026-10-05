# Kiến trúc Frontend

- Cấu trúc thư mục & luật: `rules/architecture-rules.md`, `rules/frontend-rules.md`.
- Router (`app/router.tsx`): `/auth/*` dùng `AuthLayout`; `/app/*` dùng `ProtectedRoute` + `AppLayout`; trang trong `/app` lazy load. `/` → `/app`, `/login` → `/auth/login`.
- Menu: `layouts/nav-items.ts` theo sitemap; mục chưa làm có `ready: false` (hiện mờ, nhãn "Sắp có").
- Dữ liệu: `lib/api-client.ts` (gắn token, chuẩn hoá lỗi — sẽ thêm cùng module đầu tiên) → `features/<m>/api` → hooks React Query.
- Realtime board: subscribe kênh Supabase theo `board_id`, khi có thay đổi → `invalidateQueries(['tasks', boardId])`.
- Style: Tailwind với token màu ở `docs/ui-ux/colors.md`; component dùng chung ở `components/ui`.

## Route chính

Bảng route đầy đủ, quyền xem và nguồn dữ liệu từng trang: `docs/ui-ux/frontend-spec.md` mục 2.
Quy ước route phẳng `/app/<module>` (không dùng `/app/hrm/*`).
