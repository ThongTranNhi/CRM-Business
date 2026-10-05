# Quy tắc Frontend (apps/web)

## Đặc tả giao diện

Nội dung từng trang, nút bấm và liên kết giữa các trang: `docs/ui-ux/frontend-spec.md` (bắt buộc đọc trước khi làm trang mới).
Không dùng dữ liệu giả: mỗi tính năng làm đủ migration → API → giao diện (ADR 008).

## Luồng dữ liệu

`features/<m>/api/*.ts` (gọi HTTP qua `lib/api-client.ts`) → `features/<m>/hooks/*` (React Query) → component.

- Component KHÔNG gọi `fetch`/`supabase` trực tiếp (ngoại lệ: auth, upload, realtime — vẫn bọc trong api/hook của module).
- Server state chỉ nằm trong React Query. Không copy vào `useState`.
- State UI cục bộ (mở modal, tab) dùng `useState`. Chưa dùng store toàn cục; cần thì HỎI.

## Component

- Một component một việc. > ~200 dòng → tách.
- Nghiệp vụ (tính overdue, tiến độ checklist...) đặt ở hàm thuần trong module, không viết trong JSX.
- Props có type rõ ràng. Không `any`.
- Dùng lại `components/ui/*` trước khi tạo mới. Ghép className bằng `lib/cn.ts`.

## Form

- Validate bằng zod schema trong `features/<m>/schemas/`.
- Hiển thị lỗi cạnh trường, nút submit disable/loading khi đang gửi.

## Mỗi màn hình có đủ 4 trạng thái

loading (skeleton) · empty (`EmptyState` + nút hành động) · error (thông báo + thử lại) · có dữ liệu.

## Router

- Khu đăng nhập `/auth/*` (AuthLayout), khu ứng dụng `/app/*` (ProtectedRoute + AppLayout). Route phẳng `/app/<module>` — bảng route ở `docs/ui-ux/frontend-spec.md` mục 2.
- Trang trong `/app` lazy load. Module xong → thêm route + đổi `ready: true` trong `layouts/nav-items.ts`.

## Hiệu năng

- Kéo thả task: optimistic update + rollback khi lỗi.
- `staleTime` hợp lý (danh sách tĩnh như phòng ban: vài phút).
- Danh sách dài: phân trang hoặc virtual list.

## Quyền

- Ẩn/disable nút theo quyền chỉ để UX. Backend luôn kiểm tra lại.

## Biến môi trường

Chỉ `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`. TUYỆT ĐỐI không có `service_role`.
