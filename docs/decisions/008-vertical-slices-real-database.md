# ADR 008: Làm theo từng lát dọc với database thật (thay thế ADR 007)

- **Trạng thái:** Đã chấp nhận — thay thế ADR 007
- **Ngày:** 2026-10-06

## Bối cảnh

Chủ dự án đã tạo project Supabase và muốn dùng dữ liệu thật ngay từ đầu; bảng nào cần thì tạo thêm trong lúc làm. Dữ liệu mẫu (ADR 007) sẽ phải viết logic hai lần và dễ lệch với backend.

## Quyết định

- **Không dùng lớp dữ liệu mẫu.** Không có `VITE_USE_MOCK`, không có `lib/mock/`, không có file `*.mock.ts`.
- Mỗi tính năng làm trọn **một lát dọc**, theo thứ tự:
  1. **Migration** mới trong `supabase/migrations/` (bảng, ràng buộc, index, RLS, trigger/RPC nếu cần).
  2. Áp migration lên Supabase, rồi chạy `scripts/generate-types.sh` (hoặc lệnh tương đương) để cập nhật type.
  3. **API** module trong `apps/api/src/modules/<module>/` (routes → controller → service → repository, zod, quyền, audit/activity).
  4. **Giao diện** theo `docs/ui-ux/frontend-spec.md`.
  5. Tài liệu: `docs/api/endpoints/<module>.md`, `docs/database/*`, `docs/changelog/migrations.md`.
- **Bảng phát sinh thêm** trong lúc làm cũng đi đúng đường đó: viết migration trong repo trước, rồi mới áp lên Supabase. **Không tạo/sửa bảng bằng tay** trên giao diện Supabase (Table Editor), vì máy khác và môi trường production sẽ không có thay đổi đó.
- Trước khi tạo bảng mới: kiểm tra bảng/cột đã có trong các migration trước, không tạo trùng (ví dụ `departments`, `employees`, `audit_logs`, `app_accounts` đã có).
- **Dữ liệu để thử**: `supabase/seed.sql` (chỉ chạy ở môi trường dev) tạo dữ liệu mẫu trong database thật: vài phòng ban, nhân viên, Dashboard, task… Tài khoản thử cho 5 role tạo theo cách ở `docs/development/username-admin-setup.md`; mật khẩu thử không ghi vào repo.
- Trang của module **chưa làm tới** vẫn có trong menu nhưng hiển thị `EmptyState` "Tính năng đang được xây dựng" — không dùng dữ liệu giả.

## Hệ quả

- Làm đến đâu chạy thật đến đó; không phải viết lại phần dữ liệu khi có API.
- Mỗi đợt dài hơn vì gồm cả DB + API + UI, nên chia đợt nhỏ theo module.
- Migration là nguồn sự thật của schema; mọi máy và production dựng lại được database từ repo.
