# Department Dashboard (Board Kanban)

**Route:** `/app/workspace/:dashboardId` · task mở bằng `?task=:taskId` (drawer)

## Bố cục

- Header: breadcrumb (Workspace › Phòng ban), tên Dashboard, thành viên, nút **+ Thêm công việc**.
- Thanh công cụ: ô tìm kiếm, chip lọc "Việc của tôi", "Quá hạn".
- 3 cột ngang: **VIỆC CẦN LÀM** (`todo`) · **VIỆC ĐANG LÀM** (`in_progress`) · **ĐÃ HOÀN THÀNH** (`done`).
  Màu cột: gray / info / success. Tiêu đề cột kèm số task. Cột đầu có nút "Thêm công việc" ở cuối.
- Màn hình nhỏ: cuộn ngang, mỗi cột rộng tối thiểu 280px. Trên cảm ứng, đổi trạng thái trong drawer chi tiết.
- Cột ĐÃ HOÀN THÀNH hiện N task gần nhất + "Xem thêm".

## Tìm kiếm & lọc

Tên task · người phụ trách · trạng thái · priority · deadline (Quá hạn / Hôm nay / Tuần này) · project · tag · "Việc của tôi".
Bộ lọc lưu trên URL query để chia sẻ link.

## Quyền

Xem: thành viên phòng + `board_members` + Super Admin. Sửa cấu hình board: Manager phòng, Super Admin.

## Dữ liệu

- Tải board: **1 request** `GET /api/boards/:boardId/tasks` trả task đang mở kèm tóm tắt (assignee, số comment, số file, checklist x/y, tags) — không N+1.
- Realtime: subscribe thay đổi `tasks` theo `board_id` → làm mới cache.

## Tiêu chí nghiệm thu

- [ ] Desktop: 3 cột nằm ngang cạnh nhau.
- [ ] Board 200 task tải < 1.5s.
- [ ] Thay đổi của người khác hiện trong vài giây không cần F5.
