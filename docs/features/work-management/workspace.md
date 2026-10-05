# Workspace

**Route:** `/app/workspace` · **Module:** `workspace` (web), dùng API `department-dashboards` và `departments`

## Hiển thị

- Lưới card các Dashboard **đã tạo** mà người xem có quyền (BR-03, BR-41).
- Mỗi card: tên phòng ban, màu/biểu tượng, số task đang mở, đang làm, quá hạn, ảnh đại diện vài thành viên.
- Không hiển thị phòng ban chưa có Dashboard.
- Thẻ **+ Tạo Dashboard** — chỉ hiện với Super Admin và Department Manager.
- Ghi chú dưới lưới: liệt kê phòng ban chưa có Dashboard.
- Empty state: "Chưa có Dashboard nào" + nút tạo (nếu có quyền) hoặc lời nhắn liên hệ quản lý.
- KHÔNG đặt số liệu tổng công ty ở đây (thuộc Executive Overview).

## Tạo Dashboard (modal)

1. **Chọn phòng ban**: danh sách chỉ gồm phòng **chưa có Dashboard** mà người dùng được phép tạo.
   Department Manager chỉ thấy phòng mình quản lý.
2. **Tạo phòng ban mới ngay trong modal** (khi phòng cần tìm chưa tồn tại):
   - Link "Chưa có phòng ban cần tìm? Tạo phòng ban mới" mở form nhỏ: **Tên phòng ban** (bắt buộc, không trùng tên, không phân biệt hoa thường), **Trưởng phòng** (tuỳ chọn).
   - Lưu → gọi `POST /api/departments` → phòng ban mới xuất hiện trong danh sách, ghi "(mới tạo)" và **được chọn sẵn**.
   - Việc này **chỉ tạo phòng ban, KHÔNG tạo Dashboard** (BR-02). Người dùng phải bấm "Tạo Dashboard" ở bước 4.
   - Nếu mọi phòng ban đều đã có Dashboard → form tạo phòng ban hiện sẵn, nút "Tạo Dashboard" bị khoá cho tới khi có phòng ban mới.
   - Chỉ hiện link này với người có quyền tạo phòng ban (BR-08: Super Admin, HR Admin). Người không có quyền không thấy link; gọi thẳng API → 403.
3. Tên Dashboard (mặc định = tên phòng ban), mô tả (tuỳ chọn).
4. Bấm **Tạo Dashboard** → backend tạo `department_dashboards` + `boards` + 3 cột mặc định trong **một giao dịch** → chuyển vào Dashboard.
5. Nếu phòng đã có Dashboard (BR-04) → API trả `409 DASHBOARD_ALREADY_EXISTS` kèm `dashboardId` → UI mở Dashboard đó.

Lỗi hiển thị dưới ô tên phòng ban: "Vui lòng nhập tên phòng ban", "Phòng ban này đã tồn tại" (API: `409 DEPARTMENT_NAME_EXISTS`).

## API

| Method | Endpoint                                 | Mô tả                                                        |
| ------ | ---------------------------------------- | ------------------------------------------------------------ |
| GET    | `/api/department-dashboards`             | Danh sách Dashboard người dùng được xem                      |
| POST   | `/api/department-dashboards`             | `{ departmentId, name?, description? }`                      |
| GET    | `/api/departments?withoutDashboard=true` | Phòng ban có thể tạo Dashboard                               |
| POST   | `/api/departments`                       | `{ name, managerId? }` — tạo phòng ban (không tạo Dashboard) |

## Tiêu chí nghiệm thu

- [ ] Tạo phòng ban mới (ở trang Phòng ban hoặc trong modal) không làm xuất hiện Dashboard ở Workspace.
- [ ] Tạo phòng ban trong modal → phòng đó được chọn sẵn; bấm Tạo Dashboard → card xuất hiện.
- [ ] Tạo phòng ban trùng tên → báo lỗi, không tạo bản ghi.
- [ ] Tạo Dashboard cho phòng X → card X xuất hiện ngay.
- [ ] Tạo lần 2 cho phòng X → mở Dashboard cũ, không có bản trùng trong DB.
- [ ] Employee không thấy nút tạo; gọi thẳng API → 403.
