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
- **BR-08** Tạo phòng ban: Super Admin, HR Admin (ở trang Phòng ban hoặc ngay trong hộp thoại Tạo Dashboard). Trưởng phòng là tuỳ chọn ("Chọn sau").
- **BR-09** **Xoá phòng ban**: chỉ Super Admin (CEO, Master). "Xoá" là xoá mềm (`archived_at`), không xoá vĩnh viễn.
  - Phòng còn nhân viên → hộp thoại bắt buộc chọn **phòng nhận** để chuyển toàn bộ nhân viên (kể cả trưởng phòng, người này thành nhân viên thường ở phòng nhận); không chọn thì không xoá được.
  - Dashboard của phòng → chỉ đọc, ẩn khỏi Workspace (BR-06). Dự án, task, lịch sử giữ nguyên.
  - Phòng đã xoá ẩn khỏi mọi danh sách chọn; Super Admin xem được ở bộ lọc "Đã xoá" và **Khôi phục**. Tên phòng đã xoá được dùng lại cho phòng mới.
  - Ghi audit log (người xoá, số nhân viên chuyển, phòng nhận).

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
- **BR-22** Audit log bắt buộc cho: đổi quyền/role, đổi lương, chuyển phòng ban nhân viên, xoá task, đổi hợp đồng, tạo/xoá/khôi phục phòng ban, xoá/khôi phục nhân viên, đặt lại mật khẩu.

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
- **BR-53** **Xoá nhân viên**: chỉ Super Admin (CEO, Master). "Xoá" là xoá mềm: khoá tài khoản, thu hồi mọi phiên đăng nhập, ẩn khỏi danh sách và ô chọn người.
  - Không xoá được chính mình và tài khoản Super Admin khác.
  - Người bị xoá đang là **trưởng phòng** → phòng đó tự chuyển sang "Chưa có trưởng phòng"; hộp thoại xác nhận nói rõ điều này và cho chọn trưởng phòng mới ngay (tuỳ chọn).
  - Người bị xoá còn **việc đang mở** → hộp thoại hiện số việc và cho chọn người nhận bàn giao (tuỳ chọn; bỏ qua thì việc giữ nguyên, hiện cảnh báo "người phụ trách đã nghỉ").
  - Lịch sử (task, activity, chấm công, nghỉ phép, lương, audit) giữ nguyên; tên hiển thị kèm nhãn "(đã nghỉ)".
  - Super Admin xem ở bộ lọc "Đã xoá" và **Khôi phục** (tài khoản về trạng thái trước khi xoá — đã khoá thì vẫn khoá; không tự gán lại chức trưởng phòng).
  - Ghi audit log.
- **BR-54** **Đặt lại mật khẩu**: Super Admin đặt mật khẩu tạm cho mọi tài khoản username không phải Super Admin; người dùng bắt buộc đổi ở lần đăng nhập sau, các phiên cũ bị thu hồi (đã có, xem `docs/development/username-admin-setup.md`).
- **BR-55** Không có chức năng **xoá vĩnh viễn** trên giao diện. Nếu cần xoá hẳn dữ liệu (yêu cầu pháp lý), làm bằng quy trình riêng, có ADR.
