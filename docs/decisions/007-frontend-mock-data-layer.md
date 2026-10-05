# ADR 007: Front end làm trước với lớp dữ liệu mẫu tách riêng

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-06

## Bối cảnh

Cần xây đủ giao diện mọi trang và kiểm thử luồng bấm (`docs/ui-ux/frontend-spec.md`) trong khi API mới có `auth`, `users`. Không thể chờ toàn bộ backend, nhưng cũng không được hard-code dữ liệu nghiệp vụ trong component.

## Quyết định

- Module chưa có API dùng **dữ liệu mẫu** qua đúng một lớp: hàm trong `features/<module>/api/*.ts`.
- Biến `VITE_USE_MOCK=true` bật dữ liệu mẫu. Production (Netlify) luôn `false`.
- Cấu trúc:
  ```
  apps/web/src/lib/mock/
  ├── db.ts          kho dữ liệu trong bộ nhớ + lưu localStorage 'crm-mock-v1', hàm reset
  ├── seed.ts        dữ liệu gốc dùng chung (nhân viên, phòng ban, dashboard, task...) — id nhất quán giữa các module
  └── delay.ts       giả lập độ trễ 200–400ms
  features/<module>/api/<module>.mock.ts   hàm mẫu cùng chữ ký với hàm thật
  ```
- `features/<module>/api/<module>.api.ts` chọn thật/mẫu:
  ```ts
  const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';
  export async function listTasks(boardId: string) {
    if (USE_MOCK) return (await import('./tasks.mock')).listTasks(boardId);
    return apiClient.get<Task[]>(`/api/boards/${boardId}/tasks`);
  }
  ```
  Component và hook chỉ import từ `<module>.api.ts`, không import file `.mock.ts`.
- Hàm mẫu phải: trả đúng type trong `types.ts`, trả lỗi đúng định dạng `docs/api/errors.md`, áp các quy tắc nghiệp vụ BR-xx (không tạo trùng Dashboard, bắt buộc 1 người phụ trách, ghi activity, ghi `completed_at/by`...) và kiểm tra quyền theo role của phiên hiện tại.
- Module đã có API thật (`auth`, `users/employees`) **không** có bản mẫu.
- Khi bật dữ liệu mẫu, menu tài khoản có mục **Đổi vai trò (dev)** để thử 5 role; mục này không tồn tại khi `VITE_USE_MOCK` khác `true`.

## Hệ quả

- Xây và duyệt giao diện được ngay; khi làm API cho module nào chỉ thay hàm `http.*` và tắt bản mẫu của module đó, component giữ nguyên.
- Dữ liệu mẫu là tạm: không viết logic nghiệp vụ quan trọng chỉ ở phía mẫu mà bỏ quên ở API. Khi làm API, service phải cài đầy đủ quy tắc tương ứng.
- Bundle production không chứa dữ liệu mẫu: file `.mock.ts` và `lib/mock/` chỉ được nạp bằng `import()` động khi cờ bật.
