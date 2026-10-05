# Hồ sơ nhân viên và tài khoản quản trị

Migration: `supabase/migrations/20261005120000_employee_directory.sql`.
Chưa triển khai lên Supabase. Chạy trên project mới qua SQL Editor hoặc migration workflow.
Nếu project đã có bảng cùng tên, kiểm tra schema trước; không xóa bảng để chạy lại.

## Hồ sơ

`employees.id`: UUID tự tạo, độc lập mã nhân viên.
`employee_code`: người quản trị nhập, bắt buộc, không trùng không phân biệt hoa thường.
`full_name`, `job_title`: bắt buộc. Chức vụ không quyết định quyền hệ thống.
`department_id`: phòng ban; cho phép trống khi chưa phân phòng hoặc cho CEO/Master.
`account_id`: liên kết tài khoản, cho phép trống khi nhân viên chưa có đăng nhập.
Mỗi phòng ban có tối đa một `manager_employee_id` (NULL = "Chưa có trưởng phòng", BR-08,
từ migration 20261006090100); khi có thì phải là nhân viên thuộc phòng đó.
API lấy người quản lý bằng departments.manager_employee_id, không sao chép tên vào hồ sơ.
CEO và Master quản lý các trưởng phòng bằng quyền hệ thống; chưa có liên kết quản lý cá nhân cấp CEO.

## Tạo hai quản trị viên

1. Bật Google provider trong Supabase Auth và cấu hình Google OAuth client/callback.
2. Hai Gmail đăng nhập qua Google ít nhất một lần.
3. Quản trị database chạy trong SQL Editor:

```sql
select app_private.provision_super_admin('jathong0107@gmail.com');
select app_private.provision_super_admin('thongtran2446@gmail.com');
```

4. Đăng nhập lại để lấy JWT mới có app_metadata.role = super_admin.

Hàm đối chiếu email đã xác minh của Google với allowlist. Không cho phép trình duyệt
hoặc service_role gọi hàm cấp quyền. Hai tài khoản ngang quyền; chưa gán Gmail nào
cho chức vụ CEO hay Master. Email không phải khóa chính và không đủ để tự cấp quyền.

## Giới hạn cần nối API trước khi sử dụng thật

- RLS bật, không có policy/grant cho anon hoặc authenticated: đọc/ghi trực tiếp bị chặn.
- API dùng secret key bypass RLS, bắt buộc kiểm tra quyền và phạm vi dữ liệu trong service.
- app_accounts.status phải được kiểm tra ở MỖI request, bên cạnh chữ ký JWT.
  Middleware hiện tại CHƯA thực hiện kiểm tra này: trạng thái blocked chưa chặn API.
- CEO/Master toàn hệ thống; HR quản lý nhân sự; manager/leader chỉ phạm vi được giao;
  employee chỉ hồ sơ bản thân và trường cho phép. Chưa có endpoint nghiệp vụ.
- Audit tự ghi insert/update, chặn hard delete; audit không update/delete/truncate.
  Với secret key, auth.uid() trống; các RPC quản trị gọi `app_private.crm_actor` để đặt
  `app.actor_account_id`, nên audit ghi đúng người thao tác. Ghi thẳng bảng (không qua RPC) thì actor trống.
- FK trưởng phòng có vòng tham chiếu: đã xử lý bằng RPC `crm_create_department` /
  `crm_update_department` (migration 20261006090200), chuyển trưởng phòng vào phòng trong cùng giao dịch.
- Không có Storage policy, realtime publication, bảng lương/CCCD/hợp đồng trong migration này.
- Không chống được lộ secret key, quyền owner database, hoặc sao chép bởi người có quyền xem.

## Kiểm tra trước triển khai

Chưa chạy migration trên Postgres hoặc Supabase. Cần kiểm tra: mã nhân viên trùng,
trưởng phòng khác phòng, tạo phòng + trưởng phòng trong giao dịch, anon/authenticated
bị từ chối, audit bất biến, email ngoài allowlist và Google identity chưa xác minh.
