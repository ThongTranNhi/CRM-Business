# Quy tắc UI/UX

## Bố cục

- Sidebar trái + Header trên + vùng nội dung. Desktop trước, tablet/mobile thích ứng (sidebar thành menu trượt).
- Phong cách SaaS hiện đại: gọn, sạch, ít trang trí. Card, bảng, modal, drawer, search, filter.
- Board Kanban: 3 cột nằm ngang trên desktop; màn nhỏ cuộn ngang.
- Bản demo tham chiếu giao diện: "CRM Business Demo" (artifact) — Workspace, Board, chi tiết task, tạo phòng ban + Dashboard.

## Màu (chi tiết: docs/ui-ux/colors.md)

- Chỉ dùng token Tailwind: `primary`, `accent`, `info`, `warning`, `success`, `danger`, `gray`.
- CẤM mã hex trong component (ESLint báo lỗi).
- Chữ trắng chỉ trên: `primary-500`+, `accent-600`+, `danger-600`+, `success-700`+. KHÔNG BAO GIỜ chữ trắng trên `info`/`warning`.
- Chữ màu (trên nền trắng hoặc nền tông 100) luôn dùng tông **800**.

## Quy ước trạng thái

|                                       | Màu                            |
| ------------------------------------- | ------------------------------ |
| Việc cần làm                          | gray                           |
| Việc đang làm                         | info                           |
| Đã hoàn thành                         | success                        |
| Priority Low / Normal / High / Urgent | gray / info / warning / danger |
| Sắp đến hạn (≤ 2 ngày) / Quá hạn      | warning / danger               |

## Trạng thái màn hình

Luôn có loading (skeleton), empty (hướng dẫn + nút), error (thử lại), dữ liệu.

## Ngôn ngữ

Tiếng Việt, không i18n. Ngày `dd/MM/yyyy`, giờ 24h, tiền `1.250.000 ₫`, múi giờ Asia/Ho_Chi_Minh.

## Truy cập

Tương phản ≥ 4.5:1, điều khiển được bằng bàn phím, focus rõ, icon-only button có `aria-label`.
