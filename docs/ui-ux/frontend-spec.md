# Đặc tả Front end — toàn bộ trang, nút bấm và liên kết

> Tài liệu này là **đề bài** để xây dựng toàn bộ giao diện `apps/web`.
> Đọc kèm: `CLAUDE.md`, `rules/frontend-rules.md`, `rules/ui-ux-rules.md`, `docs/ui-ux/colors.md`,
> `docs/requirements/business-rules.md`, `docs/features/work-management/*`, ADR 008.
> Giao diện tham chiếu: `docs/ui-ux/demo/crm-demo.html` (mở bằng trình duyệt).
> Chỗ nào tài liệu này mâu thuẫn với quy tắc nghiệp vụ (BR-xx) → **DỪNG và HỎI**.

## 0. Mục tiêu

1. **Mọi trang trong menu đều có nội dung thật**, không còn mục "Sắp có".
2. **Mọi nút bấm đều làm một việc rõ ràng**: mở trang, mở modal/drawer, gọi API rồi cập nhật giao diện. Không có nút "chết".
3. **Các trang liên kết với nhau**: dữ liệu ở trang này bấm vào được để đi tới chi tiết ở trang kia (mục 6).
4. Chạy được trọn các **luồng nghiệp vụ** ở mục 7 từ đầu đến cuối chỉ bằng cách bấm.

## 1. Nguyên tắc chung (áp dụng cho mọi trang)

### 1.1 Nguồn dữ liệu

- **Chỉ dùng dữ liệu thật** từ Supabase qua API (ADR 008). Không có dữ liệu giả trong code.
- Mỗi trang làm trọn lát dọc: **migration → API → giao diện**. Bảng phát sinh thêm thì viết migration mới trong repo trước, không tạo bằng tay trên Supabase.
- Type đặt ở `features/<module>/types.ts`, bám đúng response của API.
- Module chưa làm tới: trang vẫn có route và mục menu, hiển thị `EmptyState` "Tính năng đang được xây dựng".
- Dữ liệu để bấm thử: `supabase/seed.sql` (chỉ dev).

### 1.2 Hành vi bắt buộc

| Tình huống                    | Cách làm                                                                                                          |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Đang tải                      | `Skeleton` đúng hình dạng nội dung                                                                                |
| Không có dữ liệu              | `EmptyState` + câu hướng dẫn + nút hành động chính (nếu có quyền)                                                 |
| Lỗi                           | Thông báo lỗi bằng tiếng Việt + nút **Thử lại**                                                                   |
| Thao tác ghi thành công       | Toast ngắn ("Đã tạo công việc"), dữ liệu cập nhật ngay (invalidate query)                                         |
| Thao tác ghi thất bại         | Toast lỗi, giữ nguyên dữ liệu người dùng đã nhập                                                                  |
| Thao tác không hoàn tác được  | `ConfirmDialog` (xoá, khoá tài khoản, từ chối đơn, khoá kỳ lương). KHÔNG dùng `window.confirm`                    |
| Không có quyền                | Ẩn nút. Nếu vào thẳng URL → trang 403 ("Bạn không có quyền xem trang này" + nút **Về Tổng quan**)                 |
| Form                          | Validate bằng zod, lỗi dưới từng ô, nút gửi có trạng thái loading, Enter để gửi, Esc để đóng modal                |
| Danh sách dài                 | Phân trang hoặc "Tải thêm"; tìm kiếm có debounce 300ms                                                            |
| Bộ lọc, tab, trang hiện tại   | Lưu trên URL query (`?tab=leave&status=pending&page=2`) để F5 và chia sẻ link vẫn giữ nguyên                      |
| Chi tiết mở dạng drawer/modal | Có URL riêng (`?task=<id>`, `?candidate=<id>`), đóng bằng X / bấm nền / Esc, nút Back của trình duyệt đóng drawer |
| Ngày giờ, tiền                | `dd/MM/yyyy`, 24h, giờ Việt Nam; tiền `1.250.000 ₫` (`lib/format-date.ts`, thêm `lib/format-money.ts`)            |
| Màu trạng thái                | Theo `docs/ui-ux/colors.md` mục 4. Không mã hex trong component                                                   |
| Tiêu đề tab trình duyệt       | `<Tên trang> · CRM Business`                                                                                      |

### 1.3 Bố cục trang chuẩn

Mọi trang trong `/app` dùng component `PageHeader`: breadcrumb (nếu là trang con) → tiêu đề → mô tả ngắn → nút hành động chính bên phải. Dưới đó là thanh công cụ (tìm kiếm + bộ lọc) rồi nội dung.

## 2. Bản đồ route

Quy ước: route phẳng `/app/<module>`, tên module theo `rules/architecture-rules.md`. **Bỏ tiền tố `/app/hrm/`** đang có trong `nav-items.ts`, và gộp hai mục "Tất cả nhân viên" / "Nhân viên" thành một.

| Route                         | Trang                                     | Module (feature)        | Ai thấy                                     | API      |
| ----------------------------- | ----------------------------------------- | ----------------------- | ------------------------------------------- | -------- |
| `/auth/login`                 | Đăng nhập                                 | auth                    | Khách                                       | Đã có    |
| `/auth/register`              | Đăng ký                                   | auth                    | Khách                                       | Đã có    |
| `/app/change-password`        | Đổi mật khẩu                              | auth                    | Mọi người                                   | Đã có    |
| `/app`                        | Tổng quan cá nhân                         | overview                | Mọi người (nội dung theo role)              | Cần làm  |
| `/app/workspace`              | Workspace                                 | workspace               | Mọi người (chỉ Dashboard được xem)          | Cần làm  |
| `/app/workspace/:dashboardId` | Board phòng ban (`?task=` mở chi tiết)    | department-dashboards   | Thành viên phòng / được mời / Super Admin   | Cần làm  |
| `/app/my-tasks`               | Việc của tôi                              | my-tasks                | Mọi người                                   | Cần làm  |
| `/app/projects`               | Danh sách dự án                           | projects                | Mọi người (theo phòng)                      | Cần làm  |
| `/app/projects/:id`           | Chi tiết dự án                            | projects                | Thành viên dự án / phòng                    | Cần làm  |
| `/app/workload`               | Khối lượng việc                           | workload                | Super Admin, Trưởng phòng, Trưởng nhóm      | Cần làm  |
| `/app/overview`               | Tổng quan điều hành                       | overview                | Super Admin, Trưởng phòng (phần phòng mình) | Cần làm  |
| `/app/employees`              | Nhân viên                                 | employees               | Super Admin, HR Admin, Trưởng phòng         | Đã có    |
| `/app/employees/:id`          | Hồ sơ nhân viên (tab)                     | employees               | Như trên + chính người đó                   | Một phần |
| `/app/profile`                | Hồ sơ của tôi                             | employees               | Mọi người                                   | Đã có    |
| `/app/departments`            | Phòng ban                                 | departments             | Mọi người xem; Super Admin/HR sửa           | Cần làm  |
| `/app/departments/:id`        | Chi tiết phòng ban                        | departments             | Mọi người xem; Super Admin/HR sửa           | Cần làm  |
| `/app/org-chart`              | Sơ đồ tổ chức                             | org-chart               | Mọi người                                   | Cần làm  |
| `/app/attendance`             | Chấm công                                 | attendance              | Mọi người (tab Đội nhóm cho quản lý/HR)     | Cần làm  |
| `/app/leave`                  | Nghỉ phép                                 | leave                   | Mọi người                                   | Cần làm  |
| `/app/payroll`                | Bảng lương (HR) / Phiếu lương (nhân viên) | payroll                 | Super Admin, HR; nhân viên chỉ phiếu mình   | Cần làm  |
| `/app/payroll/:periodId`      | Chi tiết kỳ lương                         | payroll                 | Super Admin, HR                             | Cần làm  |
| `/app/kpi`                    | KPI & Đánh giá                            | kpi, performance        | Mọi người (theo phạm vi)                    | Cần làm  |
| `/app/recruitment`            | Tuyển dụng (`?candidate=`)                | recruitment             | Super Admin, HR, Trưởng phòng               | Cần làm  |
| `/app/onboarding`             | Nhận việc / Nghỉ việc (tab)               | onboarding, offboarding | Super Admin, HR, Trưởng phòng               | Cần làm  |
| `/app/assets`                 | Tài sản                                   | assets                  | Super Admin, HR; nhân viên xem tài sản mình | Cần làm  |
| `/app/documents`              | Tài liệu                                  | documents               | Theo quyền từng tài liệu                    | Cần làm  |
| `/app/approvals`              | Phê duyệt (`?request=`)                   | approvals               | Mọi người                                   | Cần làm  |
| `/app/notifications`          | Tất cả thông báo                          | notifications           | Mọi người                                   | Cần làm  |
| `/app/reports`                | Báo cáo                                   | reports                 | Super Admin, HR, Trưởng phòng               | Cần làm  |
| `/app/settings`               | Cài đặt (tab)                             | settings, audit-log     | Super Admin (một số tab cho HR)             | Cần làm  |
| `/app/403`, `*`               | Không có quyền / Không tìm thấy           | —                       | —                                           | —        |

## 3. Khung ứng dụng

### 3.1 Sidebar

- Nhóm **Công việc**: Tổng quan · Workspace · Việc của tôi · Dự án · Khối lượng việc · Tổng quan điều hành.
- Nhóm **Nhân sự**: Nhân viên · Phòng ban · Sơ đồ tổ chức · Chấm công · Nghỉ phép · Bảng lương · KPI & Đánh giá · Tuyển dụng · Nhận việc/Nghỉ việc · Tài sản · Tài liệu · Phê duyệt.
- Nhóm **Hệ thống**: Báo cáo · Cài đặt.
- Mục hiện theo role (`nav-items.ts` có trường `roles`); mục không có quyền **ẩn hẳn**, không hiện mờ.
- Badge số trên mục: **Phê duyệt** (số đơn chờ tôi duyệt, màu accent), **Việc của tôi** (số việc quá hạn, màu danger). Bấm mục → đi trang; badge cập nhật sau mỗi thao tác liên quan.
- Mobile: menu trượt, bấm mục thì tự đóng.

### 3.2 Header

| Thành phần          | Hành vi                                                                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ô tìm kiếm          | Gõ ≥ 2 ký tự → dropdown kết quả nhóm **Công việc / Nhân viên / Dự án / Phòng ban** (tối đa 5 mỗi nhóm). Bấm kết quả → đi đúng trang (task mở drawer). Phím `/` để focus           |
| Nút **+ Tạo nhanh** | Menu: Công việc mới (chọn Dashboard → modal tạo task) · Đơn nghỉ phép · Yêu cầu phê duyệt · Dự án mới (nếu có quyền)                                                              |
| Chuông thông báo    | Chấm accent khi có chưa đọc. Bấm → dropdown 10 thông báo mới nhất; bấm 1 dòng → đánh dấu đã đọc + đi tới đối tượng; "Đánh dấu tất cả đã đọc"; "Xem tất cả" → `/app/notifications` |
| Menu tài khoản      | Tên, vai trò, phòng ban → **Hồ sơ của tôi** · **Đổi mật khẩu** · **Đăng xuất** (ConfirmDialog không cần). Thử các role bằng tài khoản thử (seed dev), không có nút đổi role       |

### 3.3 Component dùng chung cần thêm vào `components/ui`

`PageHeader`, `ErrorState` (thông báo lỗi + nút Thử lại), `Tabs`, `Table` (sắp xếp cột, hàng bấm được), `Pagination`, `SearchInput` (debounce), `Select`, `Textarea`, `DateInput` (input date gốc), `Modal`, `Drawer`, `ConfirmDialog`, `Toast` + `useToast`, `Dropdown`/`Menu`, `StatCard`, `ProgressBar`, `StatusBadge` (map trạng thái → tone), `AvatarGroup`, `Timeline` (lịch sử/duyệt), `BarList` (biểu đồ thanh ngang bằng CSS, không cài thư viện chart).
Mỗi component: có type props rõ ràng, dùng token màu, có `aria-*` đúng, không gọi API.

## 4. Đặc tả từng trang

Ký hiệu: **[Nút]** → kết quả. "→" là điều hướng; "⧉" là mở modal/drawer; "✓" là thao tác ghi.

### 4.1 Xác thực (đã có, hoàn thiện)

- **Đăng nhập** `/auth/login`: username + mật khẩu; Google cho CEO/Master (theo `username-admin-setup.md`). **[Đăng nhập]** ✓ → trang trước đó hoặc `/app`; nếu `mustChangePassword` → `/app/change-password`. Link **Tạo tài khoản** → `/auth/register`. Dòng "Quên mật khẩu? Liên hệ HR để được đặt lại".
- **Đăng ký** `/auth/register`: username, mật khẩu, nhập lại. **[Tạo tài khoản]** ✓ → đăng nhập luôn → `/app`. Link **Đã có tài khoản? Đăng nhập**.
- **Đổi mật khẩu** `/app/change-password`: khi bị bắt buộc thì không hiện Sidebar, chỉ có form + **[Đăng xuất]**.

### 4.2 Tổng quan cá nhân `/app`

Nội dung (theo thứ tự trên trang):

1. Lời chào + ngày. Nút nhanh: **[Chấm công vào]**/**[Chấm công ra]** ✓ (đổi theo trạng thái hôm nay) · **[Tạo đơn nghỉ]** ⧉ modal đơn nghỉ · **[Vào Workspace]** → `/app/workspace`.
2. 4 `StatCard` việc của tôi: Cần làm · Đang làm · Quá hạn · Xong tuần này. Bấm thẻ → `/app/my-tasks?tab=<tương ứng>`.
3. **Việc sắp đến hạn** (7 ngày, tối đa 8 dòng): bấm dòng → `/app/workspace/:dashboardId?task=<id>`. Link **Xem tất cả** → `/app/my-tasks`.
4. **Chờ tôi duyệt** (chỉ quản lý/HR, tối đa 5): bấm dòng → `/app/approvals?request=<id>`. Nút nhanh **[Duyệt]**/**[Từ chối]** ✓ ngay trên dòng.
5. **Đơn của tôi** (5 đơn gần nhất, trạng thái màu) → `/app/approvals?tab=mine&request=<id>`.
6. **Thông báo mới** (5 dòng) → đối tượng tương ứng.
7. Super Admin: thêm khối **Toàn công ty hôm nay** (đi làm/ nghỉ / quá hạn) → `/app/overview`.

### 4.3 Workspace `/app/workspace` và Board `/app/workspace/:dashboardId`

Làm đúng `docs/features/work-management/workspace.md`, `department-dashboard.md`, `task-management.md`, `drag-and-drop.md`, `activity-log.md` và bản demo. Bổ sung liên kết:

- Card Dashboard → Board. Ghi chú "phòng chưa có Dashboard" có link tên phòng → `/app/departments/:id`.
- Board: avatar thành viên → `/app/employees/:id`; tên dự án trên card/chi tiết → `/app/projects/:id`; nút **[Cài đặt board]** ⧉ (Trưởng phòng/Super Admin): đổi tên, mô tả, thêm/bớt thành viên được mời (`board_members`), lưu trữ Dashboard (ConfirmDialog).
- Chi tiết task (drawer): người phụ trách/phối hợp → hồ sơ; **[Sao chép link]** copy URL `?task=`; **[Lưu trữ]** ✓ ConfirmDialog (BR-19); bình luận có @mention (gợi ý tên thành viên) → tạo thông báo cho người được nhắc; upload file lên Supabase Storage (bucket private, signed URL).
- Tạo task: modal như demo; trường Dự án chỉ liệt kê dự án cùng phòng.

### 4.4 Việc của tôi `/app/my-tasks`

- Tab: **Hôm nay · Tuần này · Quá hạn · Tất cả đang mở · Đã xong** (URL `?tab=`), số đếm trên tab.
- Bộ lọc: phòng ban/Dashboard, ưu tiên, dự án; tìm theo tên.
- Danh sách nhóm theo trạng thái; mỗi dòng: tên, Dashboard, dự án, ưu tiên, hạn, checklist x/y.
- Bấm dòng → `/app/workspace/:dashboardId?task=<id>`. Checkbox nhanh ở đầu dòng ✓ đánh dấu hoàn thành (áp BR-14, có hoàn tác trong toast 5 giây).
- Gồm cả việc mình là **người phối hợp** (nhãn "Phối hợp").
- Trống → "Bạn không có việc nào" + **[Vào Workspace]**.

### 4.5 Dự án `/app/projects` và `/app/projects/:id`

- Danh sách: bảng/thẻ có tên, phòng ban, chủ dự án, thành viên, hạn, **tiến độ tính từ task** (BR-31), trạng thái (Đang chạy/Tạm dừng/Hoàn thành). Lọc phòng ban, trạng thái. **[Tạo dự án]** ⧉: tên, mô tả, phòng ban, chủ dự án, thành viên, ngày bắt đầu, hạn.
- Chi tiết, tab:
  - **Tổng quan**: mô tả, tiến độ, số task theo trạng thái (bấm → tab Công việc đã lọc), hạn sắp tới.
  - **Công việc**: danh sách task của dự án (bấm → board `?task=`), **[Thêm công việc]** ⧉ modal tạo task với dự án điền sẵn, **[Mở trên board]** → Dashboard phòng lọc theo dự án (`?project=<id>`).
  - **Thành viên**: thêm/bớt (chủ dự án, Trưởng phòng) → hồ sơ khi bấm tên.
  - **Tệp** và **Hoạt động** (dòng thời gian thay đổi của dự án).
- **[Sửa]** ⧉, **[Lưu trữ]** ✓ ConfirmDialog.

### 4.6 Khối lượng việc `/app/workload`

- Bảng: nhân viên · phòng ban · Cần làm · Đang làm · Quá hạn · Xong (30 ngày) · thanh `BarList` tổng việc đang mở. Sắp xếp theo cột; lọc phòng ban (Trưởng phòng mặc định phòng mình).
- Bấm tên → `/app/employees/:id?tab=tasks`. Bấm một con số → Dashboard phòng đó lọc `?assignee=<id>&status=<...>`.
- Tô màu warning cho người có > 10 việc đang mở, danger cho người có việc quá hạn.

### 4.7 Tổng quan điều hành `/app/overview`

- `StatCard`: Tổng việc · Cần làm · Đang làm · Hoàn thành · Quá hạn (bấm → danh sách lọc tương ứng ở `/app/reports?report=tasks&status=`).
- **Công việc theo phòng ban** (`BarList` chồng 3 màu trạng thái): bấm phòng → Dashboard phòng đó.
- **Tiến độ dự án** (top 8): bấm → `/app/projects/:id`.
- **Hạn chót 7 ngày tới**: bấm → task.
- **Nhân viên quá tải / nhiều việc quá hạn** (top 5) → `/app/workload`.
- **Nhân sự hôm nay**: đi làm, đi muộn, nghỉ phép → `/app/attendance?tab=team`.
- Lọc kỳ: Tuần này / Tháng này / Quý này.

### 4.8 Nhân viên `/app/employees` và `/app/employees/:id`

- Danh sách (API thật): tìm theo tên/username/mã, lọc phòng ban, trạng thái; cột: ảnh, họ tên, mã NV, chức vụ, phòng ban, trưởng phòng, trạng thái. Phân trang 25.
  **[Thêm nhân viên]** → `/app/onboarding?new=1` (tạo hồ sơ nhận việc), không tạo trực tiếp ở đây.
- Hồ sơ, tab (URL `?tab=`):
  - **Thông tin** (API thật): như hiện có; Super Admin sửa tên, chức vụ, phòng ban, trạng thái; **[Đặt lại mật khẩu]** ⧉ (đã có).
  - **Công việc**: việc đang mở của người này → task; link **Xem khối lượng** → `/app/workload`.
  - **Chấm công**: bảng công tháng hiện tại → `/app/attendance?employee=<id>`.
  - **Nghỉ phép**: số ngày còn lại theo loại + đơn gần đây → `/app/approvals?request=`.
  - **Tài sản**: tài sản đang giữ → `/app/assets?asset=<id>`.
  - **Tài liệu**: hợp đồng, NDA… → `/app/documents?doc=<id>`.
  - **KPI**: KPI cá nhân → `/app/kpi?level=employee&employee=<id>`.
  - **Lương** (chỉ Super Admin/HR và chính người đó): phiếu lương → `/app/payroll?payslip=<id>`.
- Tên phòng ban → `/app/departments/:id`; tên trưởng phòng → hồ sơ trưởng phòng.

### 4.9 Hồ sơ của tôi `/app/profile`

Đã có (API thật). Thêm: các khối tóm tắt dẫn link như tab hồ sơ nhân viên (việc, phép còn lại, tài sản đang giữ, phiếu lương gần nhất). **[Đổi mật khẩu]** → `/app/change-password`.

### 4.10 Phòng ban `/app/departments` và `/app/departments/:id`

- Danh sách: tên, trưởng phòng, số nhân viên, Dashboard (**Đã có** → nút **[Mở Dashboard]** → board; **Chưa có** → nút **[Tạo Dashboard]** → `/app/workspace?createFor=<departmentId>` mở sẵn modal với phòng đã chọn).
  **[Tạo phòng ban]** ⧉ (Super Admin/HR, BR-08): tên (không trùng), trưởng phòng. **Không** tự tạo Dashboard (BR-02).
- Chi tiết: thông tin + **[Sửa]** ⧉ (đổi tên, đổi trưởng phòng) · **Thành viên** (bấm → hồ sơ; **[Thêm thành viên]** ⧉ chọn nhân viên; **[Chuyển phòng]** ⧉ cho từng người, ghi audit) · **Dự án** của phòng · **KPI phòng** → `/app/kpi?level=department&department=<id>` · **[Lưu trữ phòng ban]** ✓ ConfirmDialog (BR-06).

### 4.11 Sơ đồ tổ chức `/app/org-chart`

- Cây: CEO → Giám đốc/Trưởng phòng → Trưởng nhóm → Nhân viên (từ trưởng phòng + quản lý trực tiếp). Thu gọn/mở rộng nhánh, tìm người (cuộn và tô sáng).
- Bấm thẻ người → `/app/employees/:id`; bấm tên phòng → `/app/departments/:id`.
- Màn nhỏ: chuyển sang dạng danh sách thụt lề.

### 4.12 Chấm công `/app/attendance`

- Tab **Của tôi**: thẻ hôm nay (giờ vào/ra, trạng thái Đúng giờ/Đi muộn/Về sớm) với **[Chấm công vào]**/**[Chấm công ra]** ✓; lịch tháng (mỗi ngày một ô màu theo trạng thái; bấm ngày → chi tiết); tổng hợp tháng (ngày công, đi muộn, OT, vắng). **[Đề nghị sửa công]** ⧉ → tạo yêu cầu ở Phê duyệt (loại "Sửa công").
- Tab **Đội nhóm** (Trưởng phòng/HR): bảng nhân viên × ngày; lọc phòng, tháng; bấm tên → hồ sơ tab Chấm công. **[Đăng ký OT]** cho nhân viên → Phê duyệt (loại OT).

### 4.13 Nghỉ phép `/app/leave`

- Thẻ số ngày còn lại theo **loại nghỉ** (lấy từ cấu hình Cài đặt, không hard-code).
- **[Tạo đơn nghỉ]** ⧉: loại, từ ngày–đến ngày, nửa ngày sáng/chiều, lý do, người bàn giao việc (tuỳ chọn). Tính số ngày tự động, cảnh báo khi vượt số ngày còn lại. Gửi ✓ → tạo yêu cầu ở Phê duyệt (luồng Nhân viên → Trưởng phòng → HR, BR-50) → toast có link **Xem đơn**.
- Tab **Đơn của tôi** (trạng thái màu: chờ duyệt warning, đã duyệt success, từ chối danger, đã huỷ gray); bấm → `/app/approvals?request=<id>`; **[Huỷ đơn]** ✓ khi còn chờ duyệt.
- Tab **Lịch nghỉ của đội** (Trưởng phòng/HR): lịch tháng ai nghỉ ngày nào → bấm tên → hồ sơ.

### 4.14 Bảng lương `/app/payroll`, `/app/payroll/:periodId`

- **Nhân viên**: danh sách **Phiếu lương của tôi** theo tháng; bấm ⧉ phiếu lương chi tiết (lương cơ bản, phụ cấp, OT, thưởng, hoa hồng, khấu trừ, bảo hiểm, thuế, **thực nhận**).
- **Super Admin/HR**: danh sách **kỳ lương** (tháng, số nhân viên, tổng chi, trạng thái Nháp/Đã khoá/Đã chi). **[Tạo kỳ lương]** ⧉ (tháng). Chi tiết kỳ: bảng từng nhân viên, sửa các khoản khi Nháp ✓ (ghi audit), **[Khoá kỳ lương]** ✓ ConfirmDialog, **[Đánh dấu đã chi]** ✓. Bấm tên → hồ sơ tab Lương.
- Số tiền mặc định **che** (`••••••`), bấm biểu tượng mắt để hiện. Không lưu số tiền vào URL.

### 4.15 KPI & Đánh giá `/app/kpi`

- Tab **KPI**: chọn cấp **Công ty / Phòng ban / Cá nhân** (`?level=`), kỳ (quý). Bảng: tên KPI, chỉ tiêu, trọng số, tiến độ (`ProgressBar`), kết quả, người phụ trách. **[Thêm KPI]** ⧉ (quản lý); **[Cập nhật tiến độ]** ⧉. Bấm phòng/nhân viên → trang tương ứng.
- Tab **Đánh giá hiệu suất**: chu kỳ (3/6/12 tháng), danh sách phiếu đánh giá (Tự đánh giá, Quản lý, Đồng nghiệp, HR) với trạng thái. **[Mở phiếu]** ⧉ form chấm điểm theo tiêu chí + nhận xét ✓. HR: **[Tạo chu kỳ đánh giá]** ⧉.

### 4.16 Tuyển dụng `/app/recruitment`

- Thanh trên: chọn **vị trí tuyển** (lọc), **[Tạo vị trí]** ⧉, **[Thêm ứng viên]** ⧉.
- Pipeline Kanban kéo thả: **Ứng tuyển · Sàng lọc · Phỏng vấn · Kiểm tra · Offer · Đã nhận · Từ chối** (cùng cơ chế kéo thả với Board công việc).
- Bấm thẻ ⧉ drawer ứng viên (`?candidate=`): thông tin, CV (tệp), lịch phỏng vấn **[Đặt lịch phỏng vấn]** ⧉, nhận xét, lịch sử chuyển bước.
- Ở bước **Đã nhận**: **[Chuyển thành nhân viên]** ✓ → tạo hồ sơ nhận việc → `/app/onboarding?person=<id>` (BR-51).

### 4.17 Nhận việc / Nghỉ việc `/app/onboarding`

- Tab **Nhận việc**: danh sách người mới (ngày bắt đầu, phòng ban, tiến độ checklist). Bấm ⧉ checklist: tạo hồ sơ nhân viên, tạo tài khoản, cấp laptop (**[Cấp tài sản]** → modal gán tài sản ở Tài sản), cấp thẻ ra vào, ký hợp đồng (**[Tải hợp đồng]** → Tài liệu), gán quản lý, đào tạo. Tick từng mục ✓. Hoàn tất → hồ sơ nhân viên.
- Tab **Nghỉ việc**: **[Bắt đầu nghỉ việc]** ⧉ chọn nhân viên + ngày làm cuối. Checklist: bàn giao việc (link danh sách việc đang mở của người đó), thu hồi tài sản (link Tài sản lọc theo người), khoá tài khoản, quyết toán lương (link Bảng lương), lưu trữ hồ sơ. Hoàn tất ✓ ConfirmDialog (BR-52).

### 4.18 Tài sản `/app/assets`

- Bảng: mã, tên, loại (Laptop, Điện thoại, Màn hình, SIM, Thẻ ra vào, Thiết bị), trạng thái (Trong kho / Đang cấp / Sửa chữa / Thanh lý), người giữ, ngày cấp. Lọc theo loại, trạng thái, người giữ (`?employee=`).
- **[Thêm tài sản]** ⧉. Mỗi dòng: **[Cấp cho nhân viên]** ⧉ chọn người ✓; **[Thu hồi]** ✓ ConfirmDialog; bấm dòng ⧉ drawer lịch sử cấp/thu hồi (`?asset=`). Tên người giữ → hồ sơ.
- Nhân viên thường chỉ thấy tài sản mình đang giữ, không có nút sửa.

### 4.19 Tài liệu `/app/documents`

- Cột trái: danh mục (Hợp đồng lao động, NDA, Chính sách công ty, Quyết định, Chứng chỉ, Hồ sơ cá nhân). Bên phải: bảng tài liệu (tên, danh mục, gắn với nhân viên, người tải lên, ngày, mức truy cập).
- **[Tải lên]** ⧉: tệp, danh mục, gắn nhân viên (tuỳ chọn), mức truy cập (Toàn công ty / Phòng ban / Riêng HR / Riêng người được gắn). Bấm dòng ⧉ xem trước + **[Tải xuống]** (signed URL khi có API).
- Tên nhân viên được gắn → hồ sơ tab Tài liệu.

### 4.20 Phê duyệt `/app/approvals`

- Tab **Chờ tôi duyệt** · **Tôi đã gửi** · **Tất cả** (HR/Super Admin) (`?tab=`), số đếm trên tab. Lọc loại: Nghỉ phép, OT, Chi phí, Công tác, Cấp thiết bị, Điều chỉnh lương, Sửa công.
- **[Tạo yêu cầu]** ⧉: chọn loại → form riêng của loại đó (nghỉ phép dùng lại form ở 4.13).
- Bấm dòng ⧉ drawer (`?request=`): nội dung, người gửi (→ hồ sơ), **`Timeline` các bước duyệt** (ai, lúc nào, ý kiến), đối tượng liên quan (→ trang tương ứng). **[Duyệt]** ✓ / **[Từ chối]** ✓ (bắt buộc nhập lý do, ConfirmDialog). Người gửi: **[Huỷ yêu cầu]** khi chưa ai duyệt.
- Sau mỗi thao tác: cập nhật badge Sidebar, gửi thông báo cho người gửi và người duyệt bước sau.

### 4.21 Thông báo `/app/notifications`

- Danh sách theo ngày; lọc **Tất cả / Chưa đọc**, theo loại (Công việc, Phê duyệt, Nhân sự, Hệ thống). Mỗi dòng có biểu tượng, nội dung, thời gian; bấm → đối tượng + đánh dấu đã đọc. **[Đánh dấu tất cả đã đọc]** ✓.
- Các sự kiện tạo thông báo (API tạo bản ghi `notifications` trong cùng service): được giao việc, được nhắc trong bình luận, việc sắp đến hạn (1 ngày), việc quá hạn, có đơn chờ duyệt, đơn được duyệt/từ chối, được cấp tài sản.

### 4.22 Báo cáo `/app/reports`

- Lưới thẻ báo cáo: **Công việc** (theo phòng, trạng thái, quá hạn) · **Chấm công tháng** · **Nghỉ phép** · **Nhân sự** (biến động, theo phòng) · **Tuyển dụng**. Bấm thẻ → `?report=<tên>` hiện bảng + `BarList` + bộ lọc kỳ/phòng ban.
- Mọi con số trong báo cáo bấm được → danh sách chi tiết tương ứng.
- **[Xuất CSV]**: tạo CSV ở trình duyệt cho bảng đang xem (không xử lý file lớn ở API, theo CLAUDE.md).

### 4.23 Cài đặt `/app/settings`

Tab (URL `?tab=`):

- **Công ty**: tên, logo, giờ làm việc chuẩn (dùng cho đi muộn/về sớm), ngày nghỉ lễ.
- **Vai trò & quyền** (Super Admin): bảng ma trận quyền theo `docs/architecture/permission-model.md` (xem; sửa khi có API).
- **Người dùng** → link `/app/employees`.
- **Loại nghỉ phép**: thêm/sửa/ngừng dùng loại, số ngày/năm (dữ liệu này nuôi trang Nghỉ phép).
- **Quy trình phê duyệt**: mỗi loại yêu cầu có các bước (Trưởng phòng → Giám đốc → HR/Kế toán), sắp xếp bước.
- **Nhật ký hệ thống** (audit log): bảng ai, làm gì, đối tượng, giá trị cũ → mới, thời gian; lọc người, loại; bấm đối tượng → trang tương ứng.
- **Tích hợp**: danh sách để trống với `EmptyState` "Chưa có tích hợp nào".

## 5. Phân quyền hiển thị (tóm tắt)

Dùng `role` từ `/api/auth/me` (hook `useCurrentUser`). Tạo helper `can(action)` trong `features/auth`, đọc ma trận ở `docs/architecture/permission-model.md`. Không viết `if (role === ...)` rải rác trong component. Backend vẫn phải từ chối thao tác không có quyền.

## 6. Bản đồ liên kết chéo

| Từ                              | Bấm vào                           | Đến                                                        |
| ------------------------------- | --------------------------------- | ---------------------------------------------------------- |
| Mọi nơi có tên nhân viên/avatar | Tên hoặc avatar                   | `/app/employees/:id` (nếu không có quyền xem: tooltip tên) |
| Mọi nơi có tên phòng ban        | Tên phòng                         | `/app/departments/:id`                                     |
| Mọi nơi có tên dự án            | Tên dự án                         | `/app/projects/:id`                                        |
| Mọi nơi có một công việc        | Dòng/thẻ việc                     | `/app/workspace/:dashboardId?task=<id>`                    |
| Mọi nơi có một yêu cầu/đơn      | Dòng đơn                          | `/app/approvals?request=<id>`                              |
| Tổng quan cá nhân               | Thẻ số việc                       | `/app/my-tasks?tab=…`                                      |
| Workspace                       | Phòng chưa có Dashboard           | `/app/departments/:id`                                     |
| Phòng ban                       | [Tạo Dashboard]                   | `/app/workspace?createFor=<departmentId>` (modal mở sẵn)   |
| Phòng ban                       | [Mở Dashboard]                    | `/app/workspace/:dashboardId`                              |
| Khối lượng việc                 | Con số theo trạng thái            | Board lọc `?assignee=&status=`                             |
| Tổng quan điều hành             | Thanh phòng ban                   | Board của phòng                                            |
| Hồ sơ nhân viên                 | Tab Chấm công/Nghỉ/Tài sản/…      | Trang module tương ứng đã lọc theo nhân viên               |
| Nghỉ phép                       | [Tạo đơn nghỉ] gửi xong           | Toast "Xem đơn" → `/app/approvals?request=`                |
| Chấm công                       | [Đề nghị sửa công] / [Đăng ký OT] | Phê duyệt (tạo yêu cầu)                                    |
| Tuyển dụng                      | [Chuyển thành nhân viên]          | `/app/onboarding?person=<id>`                              |
| Nhận việc                       | [Cấp tài sản] / [Tải hợp đồng]    | Modal của Tài sản / Tài liệu                               |
| Nghỉ việc                       | Thu hồi tài sản / Quyết toán      | `/app/assets?employee=` / `/app/payroll`                   |
| Nhân viên                       | [Thêm nhân viên]                  | `/app/onboarding?new=1`                                    |
| Thông báo                       | Một thông báo                     | Đối tượng gốc (task, đơn, tài sản…)                        |
| Báo cáo                         | Một con số                        | Danh sách chi tiết đã lọc                                  |
| Nhật ký hệ thống                | Đối tượng                         | Trang của đối tượng                                        |
| Header tìm kiếm / + Tạo nhanh   | Kết quả / mục menu                | Trang hoặc modal tương ứng                                 |

## 7. Luồng nghiệp vụ phải bấm chạy được từ đầu đến cuối

1. **Phòng ban → Dashboard → Việc**: Phòng ban → [Tạo phòng ban] → [Tạo Dashboard] → Workspace mở modal sẵn → tạo → Board → [Thêm công việc] giao người → kéo Cần làm → Đang làm → Đã hoàn thành → người được giao thấy thông báo và việc trong Việc của tôi; Tổng quan điều hành tăng số "Hoàn thành".
2. **Nghỉ phép**: Nhân viên [Tạo đơn nghỉ] → Trưởng phòng thấy badge Phê duyệt + thông báo → [Duyệt] → HR [Duyệt] → nhân viên nhận thông báo, số ngày phép giảm, lịch nghỉ đội có tên.
3. **Tuyển dụng → Nhận việc**: Thêm ứng viên → kéo qua các bước → Đã nhận → [Chuyển thành nhân viên] → checklist Nhận việc → [Cấp tài sản] laptop → Tài sản hiện "Đang cấp" cho người đó → hồ sơ nhân viên có tab Tài sản.
4. **Nghỉ việc**: [Bắt đầu nghỉ việc] → bàn giao việc (đổi người phụ trách từng việc) → thu hồi tài sản → khoá tài khoản → hoàn tất.
5. **Dự án**: [Tạo dự án] → tab Công việc [Thêm công việc] → kéo xong trên board → tiến độ dự án tăng.
6. **Phân quyền**: đăng nhập tài khoản thử role Nhân viên → các mục quản trị biến mất, vào thẳng `/app/payroll/:periodId` → trang 403.

## 8. Thứ tự làm (mỗi đợt = 1 nhiệm vụ, xong mới sang đợt sau)

Mỗi đợt gồm đủ **migration → API → giao diện → tài liệu** cho các module của đợt (ADR 008).

| Đợt | Nội dung                                                                                                                                                                                                                                                            | Xong khi                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Component dùng chung (3.3); Sidebar/Header/route/403 theo mục 2–3; `useCurrentUser` + `can()`; trang chưa làm hiện EmptyState; `supabase/seed.sql` (phòng ban, nhân viên mẫu); API + UI **Phòng ban** (danh sách, chi tiết, tạo, sửa, đổi trưởng phòng, thành viên) | Mọi mục menu mở được; Phòng ban chạy thật với database  |
| 2   | Bảng + API + UI **Workspace, Dashboard, Board, Task** (checklist, bình luận, activity, kéo thả lưu DB) — theo `docs/features/work-management/*`                                                                                                                     | Luồng 1 chạy được với database thật                     |
| 3   | **Việc của tôi, Dự án, Thông báo**, tìm kiếm và Tạo nhanh ở Header                                                                                                                                                                                                  | Luồng 5 chạy; thông báo sinh ra khi giao việc, nhắc tên |
| 4   | **Tổng quan cá nhân, Tổng quan điều hành, Khối lượng việc**; Hồ sơ nhân viên tab Công việc; Sơ đồ tổ chức                                                                                                                                                           | Mọi liên kết mục 6 liên quan tới công việc hoạt động    |
| 5   | **Phê duyệt** (quy trình cấu hình được), **Nghỉ phép**, **Chấm công**; Cài đặt tab Loại nghỉ phép, Quy trình phê duyệt                                                                                                                                              | Luồng 2 chạy được                                       |
| 6   | **Tuyển dụng, Nhận việc/Nghỉ việc, Tài sản, Tài liệu**                                                                                                                                                                                                              | Luồng 3 và 4 chạy được                                  |
| 7   | **Bảng lương, KPI & Đánh giá, Báo cáo**, Cài đặt các tab còn lại, Nhật ký hệ thống                                                                                                                                                                                  | Luồng 6 chạy được; không còn trang "đang được xây dựng" |

Mỗi đợt: migration áp lên Supabase thành công; `pnpm lint` + `pnpm typecheck` pass; test cho service mới; tự bấm thử các luồng của đợt bằng tài khoản thử; chụp màn hình desktop và mobile; cập nhật cột "API" ở mục 2; commit + push.
