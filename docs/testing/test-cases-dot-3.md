# Test case giao diện — Đợt 3

Bấm thử với database thật (sau khi áp migration của lát). Ghi kết quả: ✅ đạt · ❌ lỗi (kèm mô tả) · ⏸ chưa thử.
Đã thử 09/10/2026 bằng tài khoản Super Admin trên database thật (migration 17 đã áp). P-05 → P-09 cần đổi
tài khoản, chưa thử.
Tài khoản: CEO (Super Admin), test.truongphong (Trưởng phòng), test.nhanvien (Nhân viên), test.hr (HR Admin).

> File test case Đợt 2 chưa có trong repo nên định dạng dưới đây là đề xuất; cần thì đổi cho khớp.

## S1 — Dự án (migration 20261009090000)

| #    | Vai trò         | Bước                                                              | Kỳ vọng                                                                           | Kết quả   |
| ---- | --------------- | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------- |
| P-01 | CEO             | Mở /app/projects khi chưa có dự án                                | EmptyState "Chưa có dự án" + [Tạo dự án]                                          | ✅        |
| P-02 | CEO             | [Tạo dự án] → chọn phòng, nhập tên, chủ dự án, hạn → [Tạo dự án]  | Toast "Đã tạo dự án", mở trang chi tiết, chủ dự án nằm trong tab Thành viên       | ✅        |
| P-03 | CEO             | Tạo dự án thứ hai cùng phòng, tên giống dự án 1 (khác hoa thường) | Lỗi dưới ô tên "Phòng ban đã có dự án cùng tên"                                   | ✅        |
| P-04 | CEO             | Chọn hạn trước ngày bắt đầu                                       | Lỗi "Hạn không được trước ngày bắt đầu", không gửi                                | ✅        |
| P-05 | Trưởng phòng    | Mở modal tạo dự án                                                | Ô phòng ban khoá ở phòng mình; ô chủ dự án chỉ có người của phòng / được mời      | ⏸         |
| P-06 | Nhân viên       | Mở /app/projects                                                  | Không có [Tạo dự án]; chỉ thấy dự án phòng mình và dự án mình tham gia            | ⏸         |
| P-07 | Nhân viên       | Mở URL dự án của phòng khác (không là thành viên)                 | Trang 403                                                                         | ⏸         |
| P-08 | HR Admin        | Mở một dự án bất kỳ                                               | Xem được; không có [Sửa], [Lưu trữ], [Sửa thành viên]                             | ⏸         |
| P-09 | Nhân viên (chủ) | Mở dự án mình làm chủ                                             | Có [Sửa], [Sửa thành viên]; không có [Lưu trữ]                                    | ⏸         |
| P-10 | Trưởng phòng    | Board → [Thêm công việc] → chọn Dự án → tạo                       | Thẻ hiện tên dự án; tab Công việc có task; tiến độ "0/1 việc xong"                | ✅        |
| P-11 | Trưởng phòng    | Kéo task đó sang Đã hoàn thành                                    | Trang dự án: 100%, "1/1 việc xong"                                                | ✅        |
| P-12 | Trưởng phòng    | Drawer task → ô Dự án → "Không gắn dự án"                         | Lịch sử task "bỏ khỏi dự án …"; Hoạt động dự án "bỏ công việc … khỏi dự án"       | ✅        |
| P-13 | Trưởng phòng    | Trang dự án → [Mở trên board]                                     | Board lọc `?project=` chỉ còn task của dự án; [Xoá lọc] bỏ lọc                    | ✅        |
| P-14 | Trưởng phòng    | [Lưu trữ] → xác nhận                                              | Dự án rời danh sách, có ở lọc "Đã lưu trữ"; ô Dự án trên board không còn dự án đó | ✅        |
| P-15 | Trưởng phòng    | Lọc "Đã lưu trữ" → mở dự án → [Khôi phục]                         | Toast "Đã khôi phục dự án …"; dự án quay lại danh sách                            | ✅        |
| P-16 | Trưởng phòng    | Tab Thành viên → [Sửa thành viên] → thêm / bỏ người               | Danh sách cập nhật; Hoạt động "thêm thành viên …; bỏ thành viên …"                | ✅ (thêm) |
| P-17 | Bất kỳ          | Danh sách dự án: tìm theo tên, lọc trạng thái, F5                 | Bộ lọc giữ nguyên trên URL                                                        | ✅        |
| P-18 | Bất kỳ          | 390px: danh sách và trang chi tiết                                | Bảng cuộn ngang trong khung, không tràn trang; tab bấm được                       | ✅        |
