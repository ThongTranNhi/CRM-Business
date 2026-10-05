# Hệ màu

## 1. Màu thương hiệu & vai trò

| Token              | Gốc (500) | Dùng cho                                                            | Không dùng cho         |
| ------------------ | --------- | ------------------------------------------------------------------- | ---------------------- |
| `primary`          | `#7F59AF` | Logo, nút chính, menu active, selected, tab active, link quan trọng | —                      |
| `accent` (pink)    | `#EA4B8B` | Điểm nhấn nhỏ, badge đặc biệt, HR/People, notification              | Nền lớn, lỗi           |
| `info` (blue)      | `#63C5EA` | Việc đang làm, thông tin, progress, chart                           | Chữ trắng trên nền này |
| `warning` (orange) | `#FFB224` | Deadline sắp tới, cảnh báo, pending                                 | Chữ trắng trên nền này |
| `success`          | `#22A06B` | Đã hoàn thành, thành công                                           | —                      |
| `danger`           | `#E5484D` | Quá hạn, Urgent, lỗi, xoá                                           | —                      |
| `gray`             | thang xám | Nền, viền, chữ, Việc cần làm                                        | —                      |

## 2. Thang màu (nguồn chính: `apps/web/tailwind.config.ts` — bảng này phải khớp với file đó)

| Token   | 50      | 100     | 200     | 300     | 400     | 500         | 600     | 700     | 800     | 900     |
| ------- | ------- | ------- | ------- | ------- | ------- | ----------- | ------- | ------- | ------- | ------- |
| primary | #F5F2F9 | #EBE4F2 | #D6CAE5 | #BFACD7 | #9F83C3 | **#7F59AF** | #6C4C95 | #593E7B | #3E2C56 | #241931 |
| accent  | #FDF1F6 | #FCE2EC | #F8C5DA | #F5A5C5 | #EF78A8 | **#EA4B8B** | #C74076 | #A43561 | #732544 | #421527 |
| info    | #F3FAFD | #E6F6FC | #CDECF8 | #B1E2F5 | #8AD4EF | **#63C5EA** | #4E9CB9 | #397288 | #28505F | #172E36 |
| warning | #FFF9ED | #FFF3DC | #FFE6B9 | #FFD992 | #FFC55B | **#FFB224** | #C68A1C | #8C6214 | #62450E | #382708 |
| success | #EDF7F3 | #DCF0E7 | #B8E1D0 | #91D0B5 | #59B890 | **#22A06B** | #1D885B | #18704B | #114E34 | #0A2D1E |
| danger  | #FDF0F1 | #FBE2E3 | #F7C4C6 | #F2A4A6 | #EC767A | **#E5484D** | #C33D41 | #A03236 | #702326 | #401416 |

## 3. Quy tắc tương phản (đã đo theo WCAG, chuẩn AA ≥ 4.5:1)

| Trường hợp                        | Dùng                                                 | Tỉ lệ |
| --------------------------------- | ---------------------------------------------------- | ----- |
| Nút chính chữ trắng               | `bg-primary-500 text-white`                          | 5.3   |
| Nút xoá chữ trắng                 | `bg-danger-600 text-white`                           | 5.2   |
| Nút thành công chữ trắng          | `bg-success-700 text-white`                          | 6.1   |
| Accent chữ trắng                  | `bg-accent-600 text-white`                           | 4.8   |
| Chữ màu trên nền trắng            | tông **800** của mọi màu                             | ≥ 8.7 |
| Badge                             | `bg-<màu>-100 text-<màu>-800`                        | ≥ 7.9 |
| Chữ tối trên nền info/warning đậm | `bg-info-500 text-gray-900`                          | ≥ 9.0 |
| ❌ Cấm                            | chữ trắng trên `info-*`, `warning-*`                 | < 3   |
| ❌ Cấm                            | chữ `info-500/600`, `warning-500/600` trên nền trắng | < 3.2 |

`info-500`, `warning-500` chỉ dùng cho **nền, viền, thanh progress, chấm trạng thái, chart** — không dùng cho chữ.

## 4. Quy ước nghiệp vụ

| Ngữ cảnh                                         | Màu                            |
| ------------------------------------------------ | ------------------------------ |
| Cột Việc cần làm / Việc đang làm / Đã hoàn thành | gray / info / success          |
| Priority Low / Normal / High / Urgent            | gray / info / warning / danger |
| Deadline sắp tới (≤ 2 ngày) / quá hạn / đã xong  | warning / danger / success     |
| Thông báo chưa đọc                               | accent                         |
| Đơn chờ duyệt / đã duyệt / từ chối               | warning / success / danger     |

## 5. Ví dụ

```tsx
// ✅ đúng
<Badge tone="warning">Hạn mai</Badge>
<Button>Tạo công việc</Button>
<span className="rounded bg-warning-100 px-2 text-warning-800">Hạn mai</span>
// ❌ sai
<span style={{ color: '#FFB224' }}>Hạn mai</span>
<span className="bg-info-500 text-white">Đang làm</span>
```
