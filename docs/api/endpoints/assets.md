# API Tài sản — `/api/assets`

Module `apps/api/src/modules/assets`. Trang `/app/assets` có 2 tab (chủ dự án chốt 17/10/2026):

- **Sản phẩm** — sản phẩm công ty làm ra / sở hữu (website, ứng dụng…), có link bấm mở. Đã có (bên dưới).
- **Tài sản được cấp** — phần mềm, thiết bị cấp cho nhân viên (frontend-spec 4.18 + loại Phần mềm / tài khoản). Làm
  sau.

Bảng `products`, `product_members`, view `product_summaries` (migration `20261018090000_products.sql`). Ghi qua RPC,
mỗi thao tác ghi `audit_logs` (`resource_type = 'products'`, action `product.create` / `product.update` /
`product.members` / `product.archive`) cùng giao dịch.

## Quyền (`lib/product-access.ts`)

| Thao tác                  | Ai                                                                                                     |
| ------------------------- | ------------------------------------------------------------------------------------------------------ |
| Xem danh sách             | Mọi role                                                                                               |
| Thêm; sửa mọi trường; xoá | Super Admin mọi phòng; Trưởng phòng (role `department_manager` VÀ đang là trưởng phòng) chỉ phòng mình |
| Sửa `url`, `description`  | Thêm người phụ trách chính và người cùng phụ trách của sản phẩm đó                                     |
| `GET /form-options`       | Như Thêm (theo phòng được hỏi)                                                                         |

Không đủ quyền → `403 FORBIDDEN`. Người phụ trách gửi trường khác ngoài `url` / `description` → `403`.

## GET `/api/assets/products?q=&departmentId=&status=&kind=&page=&pageSize=`

Sản phẩm chưa xoá, thuộc phòng chưa xoá; sắp theo tên. `q` tìm theo tên (`%` `_` được escape). `status`:
`developing` (Đang phát triển) · `active` (Đang hoạt động) · `paused` (Tạm ngừng) · `discontinued` (Ngừng hẳn).
`kind` (Loại, migration `20261022090000_product_kind.sql`, chốt 22/10/2026): `company` (Sản phẩm công ty, mặc định)
· `partner` (Website doanh nghiệp hợp tác). Loại tách khỏi trạng thái: sản phẩm hợp tác vẫn có trạng thái riêng.

```json
{
  "data": [
    {
      "id": "uuid",
      "name": "Website bán hàng",
      "url": "https://shop.example.com",
      "description": "Trang bán hàng chính",
      "status": "active",
      "kind": "company",
      "department": { "id": "uuid", "name": "Kinh doanh" },
      "project": { "id": "uuid", "name": "Ra mắt web" },
      "owner": { "id": "uuid", "fullName": "Nguyễn An", "isArchived": false },
      "members": [{ "id": "uuid", "fullName": "Trần Bình", "isArchived": false }],
      "updatedAt": "2026-10-17T03:00:00Z",
      "permissions": { "canEdit": true, "canEditContent": true, "canArchive": true }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 }
}
```

`owner` là người phụ trách chính; `members` là người cùng phụ trách (không gồm `owner`). `isArchived`: người đã nghỉ
(giao diện ghi "đã nghỉ").

## GET `/api/assets/products/form-options?departmentId=`

`{ data: { people: [{ id, fullName, departmentName }], projects: [{ id, name }] } }` — `people`: mọi nhân viên
đang làm (mọi phòng, tối đa 1000); `projects`: dự án chưa lưu trữ của phòng đó.

## POST `/api/assets/products`

```json
{
  "departmentId": "uuid",
  "name": "Website bán hàng",
  "url": "https://shop.example.com",
  "description": null,
  "status": "developing",
  "kind": "company",
  "ownerEmployeeId": "uuid",
  "projectId": null,
  "memberIds": []
}
```

`201` + sản phẩm như một dòng của GET. `kind` không gửi → `company`. `url` bắt buộc `http://` / `https://` (chặn `javascript:`, `data:`… — schema
và check DB). `memberIds` tối đa 20; người phụ trách chính có trong `memberIds` thì tự bỏ ra.

## PATCH `/api/assets/products/:id`

Chỉ gửi trường cần đổi: `name`, `url`, `description` (null = xoá), `status`, `kind`, `ownerEmployeeId`, `projectId` (null =
bỏ), `memberIds` (thay cả danh sách). Không đổi phòng ban. Đổi người phụ trách chính sang người đang cùng phụ trách →
người đó rời danh sách cùng phụ trách. Body rỗng → `400`.

## DELETE `/api/assets/products/:id`

Lưu trữ (không xoá dòng) → `204`; sản phẩm ẩn khỏi danh sách, tên dùng lại được.

## Lỗi

| Mã                          | HTTP | Khi                                                        |
| --------------------------- | ---- | ---------------------------------------------------------- |
| `VALIDATION_ERROR`          | 400  | Sai dữ liệu (tên, link, mô tả, trạng thái…)                |
| `PRODUCT_NOT_FOUND`         | 404  | Không có hoặc đã xoá                                       |
| `PRODUCT_NAME_EXISTS`       | 409  | Phòng đã có sản phẩm cùng tên (không phân biệt hoa thường) |
| `PRODUCT_PERSON_NOT_FOUND`  | 422  | Người phụ trách mới không tồn tại hoặc đã nghỉ             |
| `PROJECT_NOT_IN_DEPARTMENT` | 422  | Dự án khác phòng với sản phẩm (BR-30)                      |
| `PROJECT_NOT_FOUND`         | 404  | Dự án không có hoặc đã lưu trữ                             |
| `DEPARTMENT_NOT_FOUND`      | 404  | Phòng không có hoặc đã xoá                                 |
