# Kéo thả

## Hành vi

- Kéo task giữa các cột → đổi `status`.
- Kéo trong cùng cột → đổi thứ tự (`position`).
- Khi kéo: thẻ mờ đi, ô giữ chỗ nét đứt màu primary hiện ở vị trí sẽ thả, cột đích có viền nét đứt.
- Bàn phím: chọn card, phím mũi tên để di chuyển (accessibility).
- Màn hình cảm ứng: đổi trạng thái bằng thanh 3 nút trong drawer chi tiết.

## Lưu thứ tự

`position` là số thực. Thả giữa A và B → `position = (A + B) / 2`. Đầu cột → `first - 1024`, cuối cột → `last + 1024`.
Khi khoảng cách quá nhỏ (< 0.001) → backend đánh lại số cả cột.

## API

`PATCH /api/tasks/:id/move` body `{ toStatus, beforeTaskId?, afterTaskId? }`

- Backend tính `position` từ hai task lân cận (không tin `position` client gửi).
- Kiểm tra quyền (permission-model), áp BR-13/BR-14, ghi `task_activities` — **trong một Postgres function** để nguyên tử.
- Trả task đã cập nhật.

## Frontend

1. Thả → cập nhật cache React Query ngay (optimistic).
2. Gọi API.
3. Lỗi → khôi phục vị trí cũ + toast "Không thể di chuyển công việc".
4. Thành công → toast ngắn ("Đã chuyển sang Việc đang làm" / "Đã hoàn thành: <tên>"), realtime báo cho người khác.

## Tiêu chí nghiệm thu

- [ ] Card di chuyển tức thì, không chờ mạng.
- [ ] F5 sau khi kéo → vị trí giữ nguyên.
- [ ] Sang ĐÃ HOÀN THÀNH → có `completed_at`, `completed_by`; kéo ngược lại → hai trường bị xoá, có activity "mở lại".
- [ ] Người không có quyền kéo → card trở về chỗ cũ, API 403.
