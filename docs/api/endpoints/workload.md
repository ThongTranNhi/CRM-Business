# API Khối lượng việc — `/api/workload`

Module `apps/api/src/modules/workload` (Đợt 4 S1, frontend-spec 4.6). Đọc view `employee_workload`
(migration `20261016090000_workload.sql`), không ghi gì nên không có audit.

## GET `/api/workload?departmentId=&sort=&order=&page=&pageSize=`

| Role                      | Phạm vi                                                                          |
| ------------------------- | -------------------------------------------------------------------------------- |
| Super Admin               | Mọi nhân viên chưa xoá; `departmentId` lọc một phòng (bỏ trống = mọi phòng)      |
| Trưởng phòng, Trưởng nhóm | Chỉ nhân viên phòng mình (phòng lấy từ phiên). `departmentId` phòng khác → `403` |
| HR Admin, Nhân viên       | `403 FORBIDDEN`                                                                  |

Người gọi (Trưởng phòng / Trưởng nhóm) chưa thuộc phòng nào → danh sách rỗng.

| Tham số        | Giá trị                                                         | Mặc định |
| -------------- | --------------------------------------------------------------- | -------- |
| `departmentId` | uuid                                                            | —        |
| `sort`         | `open` · `name` · `todo` · `inProgress` · `overdue` · `done30d` | `open`   |
| `order`        | `asc` · `desc`                                                  | `desc`   |
| `page`         | ≥ 1                                                             | 1        |
| `pageSize`     | 1 → 100 (giao diện dùng 25)                                     | 20       |

Thứ tự phụ: tên rồi id, để phân trang không lặp / sót dòng. Sai giá trị → `400 VALIDATION_ERROR`.

**Cách đếm** (chủ dự án chốt 16/10/2026): chỉ việc nhân viên là **người phụ trách chính**, trên **mọi** Dashboard (kể
cả phòng được mời), không cộng việc phối hợp. Bỏ task đã lưu trữ và task của phòng ban đã xoá. `overdue`: chưa xong
và hạn trước hôm nay (giờ Việt Nam). `done30d`: xong trong 30 ngày gần nhất tính cả hôm nay.

```json
{
  "data": [
    {
      "employee": { "id": "uuid", "fullName": "Nguyễn An" },
      "department": { "id": "uuid", "name": "Kinh doanh" },
      "dashboardId": "uuid",
      "todo": 3,
      "inProgress": 2,
      "open": 5,
      "overdue": 1,
      "done30d": 4
    }
  ],
  "meta": { "page": 1, "pageSize": 25, "total": 1 }
}
```

`department` null: nhân viên chưa thuộc phòng nào (chỉ Super Admin thấy). `dashboardId`: Dashboard của phòng nhân
viên — giao diện mở `/app/workspace/:dashboardId?assignee=<employeeId>&status=<todo|in_progress|done>` (Quá hạn:
`&due=overdue`); null khi phòng chưa có Dashboard. Board chỉ có việc của phòng đó, nên con số có thể lớn hơn số
thẻ hiện trên board khi người đó còn việc ở Dashboard phòng khác; với "Xong (30 ngày)", board hiện mọi việc đã
xong của người đó chứ không chỉ 30 ngày.
