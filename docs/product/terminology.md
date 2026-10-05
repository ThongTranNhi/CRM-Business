# Thuật ngữ

| Thuật ngữ                        | Nghĩa                                                                          |
| -------------------------------- | ------------------------------------------------------------------------------ |
| Department (Phòng ban)           | Đơn vị tổ chức. Tồn tại độc lập với Dashboard.                                 |
| Department Dashboard             | Board công việc của một phòng ban. Tạo thủ công, mỗi phòng tối đa 1.           |
| Workspace                        | Trang liệt kê các Dashboard **đã tạo**.                                        |
| Board                            | Bảng Kanban của Dashboard, 3 cột mặc định.                                     |
| Column / Cột                     | VIỆC CẦN LÀM (`todo`) · VIỆC ĐANG LÀM (`in_progress`) · ĐÃ HOÀN THÀNH (`done`) |
| Task / Công việc                 | Đơn vị việc, hiển thị dạng Card.                                               |
| Người phụ trách chính (Assignee) | Đúng 1 người chịu trách nhiệm task.                                            |
| Người phối hợp (Collaborator)    | 0..n người cùng làm.                                                           |
| Checklist                        | Danh sách bước nhỏ trong task; tiến độ = số mục xong / tổng.                   |
| Activity log                     | Lịch sử thao tác trên task, không xoá được.                                    |
| Audit log                        | Nhật ký thao tác nhạy cảm toàn hệ thống.                                       |
| Overdue / Quá hạn                | Quá `due_date` mà chưa `done`.                                                 |
| Executive Overview               | Trang tổng quan cho lãnh đạo, tách khỏi Workspace.                             |
| Workload                         | Số task theo từng nhân viên, theo trạng thái.                                  |
