# Vai trò người dùng

| Role (`app_metadata.role`) | Tên hiển thị      | Phạm vi                                                                         |
| -------------------------- | ----------------- | ------------------------------------------------------------------------------- |
| `super_admin`              | CEO / Super Admin | Toàn bộ hệ thống, mọi phòng ban, cấu hình, phân quyền                           |
| `hr_admin`                 | HR Admin          | Nhân sự toàn công ty: hồ sơ, phòng ban, chấm công, nghỉ phép, lương, tuyển dụng |
| `department_manager`       | Trưởng phòng      | Phòng ban mình quản lý: Dashboard, task, nhân viên, duyệt đơn cấp 1, KPI        |
| `team_leader`              | Trưởng nhóm       | Task của nhóm, giao việc trong phòng, xem workload nhóm                         |
| `employee`                 | Nhân viên         | Việc của mình, Dashboard được cấp quyền, hồ sơ & đơn từ cá nhân                 |

- Hiện có **2 tài khoản Super Admin: CEO và Master**, đăng nhập bằng Google theo allowlist (`docs/database/employee-directory-setup.md`). Không tạo Super Admin qua form đăng ký.
- Một người có **một role hệ thống**. Quyền theo phòng ban xác định qua `department_members` (ai là manager phòng nào).
- Role là dữ liệu cấu hình được ở Settings → Roles & Permissions; 5 role trên là mặc định khi seed.
- Ma trận quyền chi tiết: `docs/architecture/permission-model.md`.
