# Kéo thả

## Hành vi

- Kéo task giữa các cột → đổi cột; `status` theo nhóm trạng thái của cột đích.
- Kéo trong cùng cột → đổi thứ tự (`position`).
- Khi kéo: thẻ mờ đi, ô giữ chỗ nét đứt màu primary hiện ở vị trí sẽ thả, cột đích có viền nét đứt.
- Bàn phím và cảm ứng: mỗi thẻ có menu **"Chuyển sang cột…"** (select gốc, đưa thẻ về cuối cột chọn). Máy có
  chuột: menu hiện khi rê chuột / focus bằng Tab; màn hình cảm ứng: luôn hiện. Drawer chi tiết (Đợt 2, L5) có thêm ô
  chọn cột.
- Chỉ thẻ người xem được sửa mới kéo được (`canMove` từ API); đang kéo thì tạm dừng tự tải lại board.

## Lưu thứ tự

`position` là số thực, tính trong phạm vi một cột (`column_id`). Thả giữa A và B → `position = (A + B) / 2`. Đầu cột → `first - 1024`, cuối cột → `last + 1024`.
Khi khoảng cách quá nhỏ (< 0.001) → backend đánh lại số cả cột.

## API

`PATCH /api/tasks/:id/move` body `{ toColumnId, previousTaskId?, nextTaskId? }`

- `previousTaskId`: task ngay **trên** chỗ thả, `nextTaskId`: task ngay **dưới**; không gửi cả hai → cuối cột.
  Hai id tính từ danh sách **đầy đủ** của cột, không phải danh sách đang lọc.
- Cột đích phải cùng board; `status` của task = nhóm trạng thái của cột đích (khoá ngoại ghép
  `(column_id, board_id, status)` bảo đảm ở DB). BR-13 / BR-14 áp theo việc đổi **nhóm trạng thái**.
- Activity `moved` ghi `{ columnId, columnName, status }` ở cả `from_value` và `to_value`.

- Backend tính `position` từ hai task lân cận (không tin `position` client gửi).
- Quyền (permission-model) kiểm tra ở **service API** (`lib/work-access.ts` + `crm_work_access`) ngay trước khi gọi RPC;
  RPC `crm_move_task` áp BR-13/BR-14, tính `position`, ghi `task_activities` **trong một giao dịch**. Giữa lúc API
  kiểm tra quyền và lúc RPC ghi có một khoảng hở rất ngắn (quyền vừa bị đổi) — đã chấp nhận.
- "Chuyển sang cột…" (cuối cột) gửi không `previousTaskId` / `nextTaskId`: server đặt sau thẻ cuối thật của cột.
- Trả task đã cập nhật.

## Frontend

1. Thả → cập nhật cache React Query ngay (optimistic).
2. Gọi API.
3. Lỗi → khôi phục vị trí cũ + toast "Không thể di chuyển công việc".
4. Thành công → toast ngắn ("Đã chuyển sang việc đang làm" / "Đã hoàn thành: <tên>"), tải lại board. Người khác
   thấy thay đổi khi board tự tải lại (30 giây / khi quay lại tab); Realtime: Đợt 3.

## Tiêu chí nghiệm thu

- [ ] Card di chuyển tức thì, không chờ mạng.
- [ ] F5 sau khi kéo → vị trí giữ nguyên.
- [ ] Sang ĐÃ HOÀN THÀNH → có `completed_at`, `completed_by`; kéo ngược lại → hai trường bị xoá, có activity "mở lại".
- [ ] Người không có quyền kéo → card trở về chỗ cũ, API 403.
