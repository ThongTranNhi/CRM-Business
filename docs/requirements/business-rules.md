# Quy tắc nghiệp vụ

> Mã quy tắc (BR-xx) dùng để tham chiếu trong code review, test và tài liệu tính năng.
> Không được thay đổi khi chưa có xác nhận của chủ dự án.

## Phòng ban & Dashboard

- **BR-01** Department và Department Dashboard là hai thực thể riêng.
- **BR-02** Tạo phòng ban KHÔNG tự tạo Dashboard (kể cả khi tạo phòng ban ngay trong hộp thoại Tạo Dashboard).
- **BR-03** Workspace chỉ hiển thị Dashboard đã tạo (và người xem có quyền truy cập).
- **BR-04** Mỗi phòng ban tối đa 1 Dashboard chính. Tạo khi đã có → trả về Dashboard hiện có (`409 DASHBOARD_ALREADY_EXISTS` kèm id), UI mở Dashboard đó.
- **BR-05** Tạo Dashboard: Super Admin (mọi phòng), Department Manager (phòng mình).
- **BR-06** Phòng ban bị archive → Dashboard chuyển chỉ đọc, ẩn khỏi Workspace mặc định.
- **BR-07** Tên phòng ban lấy từ DB, không hard-code; không trùng tên (không phân biệt hoa thường).
- **BR-08** Tạo phòng ban: Super Admin, HR Admin (ở trang Phòng ban hoặc ngay trong hộp thoại Tạo Dashboard).

## Task

- **BR-10** Board mặc định 3 cột: VIỆC CẦN LÀM, VIỆC ĐANG LÀM, ĐÃ HOÀN THÀNH.
- **BR-11** Task tạo trong Dashboard tự gán `department_id` của Dashboard; người dùng không chọn lại.
- **BR-12** Mỗi task có đúng 1 người phụ trách chính (bắt buộc), 0..n người phối hợp. Người phụ trách không đồng thời là người phối hợp.
- **BR-13** Chuyển sang VIỆC ĐANG LÀM lần đầu → ghi `started_at`.
- **BR-14** Chuyển sang ĐÃ HOÀN THÀNH → ghi `completed_at`, `completed_by`. Chuyển ra khỏi → xoá hai trường này và ghi activity "mở lại".
- **BR-15** Kéo thả (đổi cột hoặc thứ tự) phải lưu DB.
- **BR-16** Quá hạn = `due_date` < hôm nay (giờ VN) và chưa `done`. Tính khi đọc, không lưu cờ.
- **BR-17** Tiến độ checklist = mục đã xong / tổng mục (làm tròn %). Không có checklist → không hiển thị.
- **BR-18** Priority: `low`, `normal` (mặc định), `high`, `urgent`.
- **BR-19** Xoá task = archive; chỉ người tạo, manager phòng, Super Admin. Ghi audit log.

## Activity & Audit

- **BR-20** Ghi activity: tạo, giao/đổi người phụ trách, đổi người phối hợp, đổi deadline, đổi priority, đổi checklist, upload file, di chuyển cột, hoàn thành, mở lại, archive.
- **BR-21** Activity log và audit log không sửa, không xoá.
- **BR-22** Audit log bắt buộc cho: đổi quyền/role, đổi lương, chuyển phòng ban nhân viên, xoá task, đổi hợp đồng, tạo/archive phòng ban.

## Project

- **BR-30** Project thuộc 1 phòng ban. Task có thể gắn project cùng phòng ban.
- **BR-31** Tiến độ project tính từ task (task `done` / tổng task chưa archive), không nhập tay.

## Quyền

- **BR-40** Mọi quyền kiểm tra ở backend. UI chỉ ẩn/hiện cho tiện.
- **BR-41** Employee chỉ thấy Dashboard của phòng mình hoặc Dashboard được thêm làm thành viên.
- **BR-42** Payroll chỉ Super Admin, HR Admin và chính nhân viên (phiếu lương của mình) được xem.

## HRM (sẽ chi tiết hoá khi làm module)

- **BR-50** Luồng nghỉ phép mặc định: Nhân viên → Trưởng phòng → HR. Loại nghỉ phép cấu hình được.
- **BR-51** Ứng viên trạng thái Hired có thể chuyển thành Employee.
- **BR-52** Offboarding hoàn tất → vô hiệu tài khoản, thu hồi tài sản, lưu trữ hồ sơ (không xoá).
