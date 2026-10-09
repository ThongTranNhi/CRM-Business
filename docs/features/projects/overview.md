# Dự án (Đợt 3 S1)

Phòng ban → Dự án → Task (BR-30). Tiến độ tính từ task thật, không nhập tay (BR-31).

## Nghiệp vụ

- Dự án thuộc đúng 1 phòng ban, tên không trùng trong phòng (dự án đã lưu trữ không tính).
- Trạng thái: Lên kế hoạch · Đang chạy · Tạm dừng · Hoàn thành. Lưu trữ thay cho xoá; khôi phục được.
- Chủ dự án và thành viên: nhân viên đang làm của phòng hoặc được mời vào board của phòng (Q6). Chủ dự án luôn là
  thành viên.
- Task chỉ gắn dự án cùng phòng (khoá ngoại ghép ở DB). Dự án đã lưu trữ không gắn thêm task được; task cũ giữ dự án.
- Tiến độ = task xong / task chưa lưu trữ; quá hạn theo giờ Việt Nam.

## Giao diện

- `/app/projects`: bảng (tên, phòng, chủ dự án, trạng thái, hạn, tiến độ %, số việc), lọc trạng thái + tìm tên trên
  URL, [+ Tạo dự án] (Super Admin, Trưởng phòng).
- `/app/projects/:id`: header + tab Tổng quan · Công việc · Thành viên · Hoạt động (`?tab=`); [Mở trên board] →
  board lọc `?project=`; task → board `?task=`.
- Board: ô "Dự án" trong modal Thêm công việc và drawer; tên dự án trên thẻ; lọc theo dự án.

## Quyền

Xem docs/architecture/permission-model.md (Dự án) và docs/api/endpoints/projects.md.
