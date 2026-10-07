# Task

## Card (trên board)

Tên · badge priority · badge deadline (warning nếu ≤ 2 ngày, danger nếu quá hạn, success kèm dấu tick nếu đã xong) · thanh tiến độ checklist · avatar + tên người phụ trách · checklist `5/7` · số bình luận · số file đính kèm. Task đã xong: tên gạch ngang, màu nhạt.

## Tạo task (+ Thêm công việc)

- Bắt buộc: **tên**, **người phụ trách chính** (lỗi: "Mỗi công việc cần đúng một người phụ trách chính").
- Tuỳ chọn: mô tả, người phối hợp, ngày bắt đầu, deadline, priority (mặc định `normal`), checklist, tags, project, file, ghi chú.
- `department_id`, `board_id` tự lấy từ Dashboard (BR-11), hiển thị dòng "Phòng ban: X (tự gán theo Dashboard)". Cột mặc định: VIỆC CẦN LÀM, xếp đầu cột.
- Người phụ trách chọn từ thành viên phòng/board.

## Chi tiết task (drawer bên phải)

- Thanh chọn trạng thái 3 nút (Việc cần làm / Việc đang làm / Đã hoàn thành).
- Thuộc tính: phòng ban, người phụ trách, người phối hợp, deadline, ưu tiên, thời điểm + người hoàn thành.
- Mô tả · Checklist (tick được, có % tiến độ) · Bình luận · File · Lịch sử hoạt động.
- Đóng bằng nút X, bấm ra ngoài hoặc phím Esc.

## Checklist

Thêm/sửa/xoá/đánh dấu/đổi thứ tự mục. Tiến độ tự tính (BR-17).

## Bình luận

Trả lời (1 cấp), @mention (tạo thông báo cho người được nhắc), ảnh, file, link. Sửa/xoá bình luận của mình (xoá mềm, hiển thị "đã xoá").

## Dữ liệu chính — bảng `tasks`

| Cột                                                 | Ghi chú                                                    |
| --------------------------------------------------- | ---------------------------------------------------------- |
| id, board_id, column_id, department_id, project_id? | column_id: khoá ngoại ghép `(column_id, board_id, status)` |
| title, description                                  |                                                            |
| status                                              | `todo` / `in_progress` / `done`                            |
| position                                            | numeric, thứ tự trong cột                                  |
| assignee_id                                         | NOT NULL — người phụ trách chính                           |
| priority                                            | `low` / `normal` / `high` / `urgent`                       |
| start_date, due_date                                | date                                                       |
| started_at, completed_at, completed_by              | ghi theo BR-13, BR-14                                      |
| created_by, created_at, updated_at, archived_at     |                                                            |

Người phối hợp: `task_collaborators(task_id, user_id)`, không được trùng `assignee_id`.

## API

| Method                | Endpoint                                       |
| --------------------- | ---------------------------------------------- |
| GET                   | `/api/boards/:boardId` (cột + task, 1 request) |
| POST                  | `/api/boards/:boardId/tasks`                   |
| GET / PATCH / DELETE  | `/api/tasks/:id`                               |
| PATCH                 | `/api/tasks/:id/move` — xem drag-and-drop.md   |
| PUT                   | `/api/tasks/:id/collaborators`                 |
| POST / PATCH / DELETE | `/api/tasks/:id/checklist[/:itemId]`           |
| GET / POST            | `/api/tasks/:id/comments`                      |
| POST / DELETE         | `/api/tasks/:id/attachments[/:fileId]`         |
| GET                   | `/api/tasks/:id/activities`                    |

## Tiêu chí nghiệm thu

- [ ] Không tạo được task thiếu người phụ trách (API trả 400).
- [ ] Task tạo trong Dashboard phòng X có `department_id = X` dù client gửi giá trị khác.
- [ ] Quá hạn hiển thị đúng theo giờ Việt Nam.
