# API Sơ đồ tổ chức — `/api/org-chart`

Module `apps/api/src/modules/org-chart` (Đợt 4, frontend-spec 4.11). Chỉ đọc view `active_departments` và
`active_employees` (2 truy vấn cho cả sơ đồ); không migration, không ghi gì nên không có audit.

## GET `/api/org-chart`

Mọi role đã đăng nhập (cùng mức với danh sách thành viên ở chi tiết phòng ban). Không có tham số.

DB chưa có "quản lý trực tiếp" nên cây là **Ban lãnh đạo → Phòng ban (Trưởng phòng) → Thành viên**:

- `leaders`: nhân viên có tài khoản Super Admin (CEO / Master).
- `departments`: phòng chưa xoá, theo tên (tối đa 200), kể cả phòng chưa có ai. `manager` = Trưởng phòng (hoặc
  `null`); `members` không gồm Trưởng phòng và Ban lãnh đạo, Trưởng nhóm (`role = team_leader`) đứng trước rồi theo
  tên.
- `unassigned`: nhân viên chưa thuộc phòng nào (không gồm Ban lãnh đạo).
- Chỉ nhân viên chưa xoá và `employment_status = active` (tối đa 1000). `avatarUrl` là signed URL (như chi tiết
  phòng ban), `null` khi chưa có ảnh.

```json
{
  "data": {
    "leaders": [
      {
        "id": "uuid",
        "fullName": "Trần Hoàng Thông",
        "jobTitle": "Giám đốc",
        "role": "super_admin",
        "avatarUrl": null
      }
    ],
    "departments": [
      {
        "id": "uuid",
        "name": "Kinh doanh",
        "manager": {
          "id": "uuid",
          "fullName": "Nguyễn An",
          "jobTitle": "Trưởng phòng",
          "role": "department_manager",
          "avatarUrl": "https://…"
        },
        "members": [
          {
            "id": "uuid",
            "fullName": "Lê Yến",
            "jobTitle": "Trưởng nhóm",
            "role": "team_leader",
            "avatarUrl": null
          }
        ]
      }
    ],
    "unassigned": []
  }
}
```

Lỗi: `401 UNAUTHENTICATED` khi chưa đăng nhập.
