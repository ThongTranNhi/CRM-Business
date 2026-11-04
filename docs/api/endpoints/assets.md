# API Tài sản — `/api/assets`

Module `apps/api/src/modules/assets`. Trang `/app/assets` có 2 tab (chủ dự án chốt 17/10/2026):

- **Sản phẩm** — sản phẩm công ty làm ra / sở hữu (website, ứng dụng…), có link bấm mở. Đã có (bên dưới).
- **Tài sản được cấp** — phần mềm, thiết bị cấp cho cá nhân, phòng ban hoặc công ty. Xem phần cuối file.

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

---

# Tab Tài sản được cấp — `/api/assets/issued`

Phần mềm, thiết bị của công ty cấp cho **cá nhân, phòng ban hoặc toàn công ty** (chủ dự án chốt 03/11/2026, mở rộng
frontend-spec 4.18). Migration `20261103090000_issued_assets.sql`: bảng `issued_assets`, `asset_assignments` (lịch
sử cấp / thu hồi), view `issued_asset_summaries`, `asset_assignment_rows`. Ghi qua RPC, mỗi thao tác ghi
`audit_logs` (`resource_type = 'issued_assets'`, action `asset.create` / `asset.update` / `asset.archive` /
`asset.issue` / `asset.return`). **Không lưu key bản quyền hay mật khẩu.**

## Quyền (`lib/issued-asset-access.ts`)

| Thao tác                                                       | Ai                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Xem danh sách                                                  | Super Admin, HR Admin: mọi tài sản. Role khác: tài sản đang cấp cho mình, phòng mình, công ty |
| Thêm, sửa, xoá, cấp, thu hồi, xem lịch sử, `GET /form-options` | Super Admin, HR Admin (service và RPC đều kiểm tra)                                           |

Không đủ quyền → `403 FORBIDDEN`.

## GET `/api/assets/issued?q=&category=&status=&holderType=&page=&pageSize=`

Tài sản chưa xoá, sắp theo tên. `q` tìm theo tên hoặc mã. `category`: `laptop` (Laptop) · `phone` (Điện thoại) ·
`monitor` (Màn hình) · `sim` (SIM) · `access_card` (Thẻ ra vào) · `software` (Phần mềm / tài khoản) · `other`
(Thiết bị khác). `status`: `in_stock` (Trong kho) · `issued` (Đang cấp) · `repair` (Sửa chữa) · `disposed`
(Thanh lý). `holderType`: `employee` (Cá nhân) · `department` (Phòng ban) · `company` (Công ty).

```json
{
  "data": [
    {
      "id": "uuid",
      "code": "LT-01",
      "name": "Laptop Dell",
      "category": "laptop",
      "status": "issued",
      "expiresOn": "2027-12-31",
      "note": null,
      "updatedAt": "2026-11-03T03:00:00Z",
      "assignment": {
        "id": "uuid",
        "holder": {
          "type": "employee",
          "id": "uuid",
          "fullName": "Trần Bình",
          "isArchived": false
        },
        "issuer": { "id": "uuid", "fullName": "Nguyễn An", "isArchived": false },
        "issuedOn": "2026-11-03",
        "note": null
      },
      "permissions": { "canManage": true }
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 1 }
}
```

`assignment` = lượt cấp đang mở (`null` khi chưa cấp). `holder`: `{ "type": "company" }` ·
`{ "type": "department", "id", "name" }` · `{ "type": "employee", "id", "fullName", "isArchived" }`. `issuer` =
người cấp (một nhân viên, chọn khi cấp).

## GET `/api/assets/issued/form-options`

`{ data: { people: [{ id, fullName, departmentName }] } }` — nhân viên đang làm (mọi phòng, tối đa 1000) cho ô
nhân viên sử dụng và ô người cấp. Phòng ban lấy ở `GET /api/departments`.

## POST `/api/assets/issued`

```json
{
  "code": "LT-01",
  "name": "Laptop Dell",
  "category": "laptop",
  "status": "in_stock",
  "expiresOn": null,
  "note": null,
  "assignment": {
    "holderType": "department",
    "departmentId": "uuid",
    "issuerEmployeeId": "uuid",
    "issuedOn": "2026-11-03",
    "note": null
  }
}
```

`201` + tài sản như một dòng của GET. `code` rỗng / null = không mã. `status` chỉ `in_stock` (mặc định) · `repair`
· `disposed` — Đang cấp chỉ có được qua `/issue` hoặc `assignment`. `assignment` (tuỳ chọn, mặc định `null`): cấp
luôn cho đối tượng đó trong cùng giao dịch (body như `POST /:id/issue`; lỗi cấp thì không tạo tài sản); khi có
`assignment` thì `status` phải là `in_stock`.

## PATCH `/api/assets/issued/:id`

Chỉ gửi trường cần đổi: `code`, `name`, `category`, `status`, `expiresOn`, `note` (null = xoá). Tài sản đang cấp
không đổi `status` → `409 ASSET_STATUS_LOCKED`. Body rỗng → `400`.

## DELETE `/api/assets/issued/:id`

Lưu trữ (không xoá dòng) → `204`. Tài sản đang cấp → `409 ASSET_IN_USE` (thu hồi trước). Lịch sử cấp giữ nguyên.

## POST `/api/assets/issued/:id/issue`

```json
{
  "holderType": "employee",
  "employeeId": "uuid",
  "issuerEmployeeId": "uuid",
  "issuedOn": "2026-11-03",
  "note": null
}
```

`holderType: "department"` gửi `departmentId` thay cho `employeeId`; `"company"` không gửi id đối tượng. Chỉ cấp tài
sản `in_stock`; trạng thái thành `issued`. Trả `200` + tài sản.

## POST `/api/assets/issued/:id/return`

`{ "returnedOn": "2026-11-10", "note": "Đổi máy" }` — đóng lượt cấp đang mở, tài sản về `in_stock`. Trả `200` + tài
sản.

## GET `/api/assets/issued/:id/history`

`{ data: [AssetAssignment] }` mới nhất trước — như `assignment` ở trên, thêm `returnedOn` (null = đang cấp) và
`returnNote`.

## Lỗi

| Mã                       | HTTP | Khi                                                                     |
| ------------------------ | ---- | ----------------------------------------------------------------------- |
| `VALIDATION_ERROR`       | 400  | Sai dữ liệu; ngày thu hồi trước ngày cấp; đối tượng không khớp loại     |
| `ASSET_NOT_FOUND`        | 404  | Không có hoặc đã xoá                                                    |
| `DEPARTMENT_NOT_FOUND`   | 404  | Phòng ban sử dụng không có hoặc đã xoá                                  |
| `ASSET_CODE_EXISTS`      | 409  | Đã có tài sản chưa xoá dùng mã này (không phân biệt hoa thường)         |
| `ASSET_NOT_AVAILABLE`    | 409  | Cấp tài sản không ở trạng thái Trong kho (kể cả hai người cấp cùng lúc) |
| `ASSET_NOT_ISSUED`       | 409  | Thu hồi tài sản chưa được cấp                                           |
| `ASSET_IN_USE`           | 409  | Xoá tài sản đang cấp                                                    |
| `ASSET_STATUS_LOCKED`    | 409  | Đổi trạng thái tay khi đang cấp, hoặc đặt tay sang Đang cấp             |
| `ASSET_PERSON_NOT_FOUND` | 422  | Nhân viên sử dụng hoặc người cấp không tồn tại / đã nghỉ                |
