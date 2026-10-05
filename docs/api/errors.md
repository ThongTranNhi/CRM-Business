# Định dạng lỗi API

```json
{
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Không tìm thấy công việc",
    "requestId": "b1f..."
  }
}
```

- `code`: UPPER_SNAKE_CASE, cố định để frontend xử lý.
- `message`: tiếng Việt, hiển thị được cho người dùng.
- `requestId`: lấy từ `request-id.middleware`, cũng trả ở header `X-Request-Id`.
- Lỗi phát sinh bằng `throw new AppError(code, message, status, details?)` (`apps/api/src/lib/app-error.ts`); `error.middleware` chuẩn hoá. Lỗi không lường trước → `500 INTERNAL_ERROR`, không lộ chi tiết.

## Mã lỗi chung

| HTTP | code                      | Khi nào                                                          |
| ---- | ------------------------- | ---------------------------------------------------------------- |
| 400  | `VALIDATION_ERROR`        | Input sai schema (kèm `details` theo trường)                     |
| 401  | `UNAUTHENTICATED`         | Thiếu/hết hạn/sai token                                          |
| 403  | `FORBIDDEN`               | Không đủ quyền                                                   |
| 404  | `NOT_FOUND`               | Route hoặc tài nguyên không tồn tại                              |
| 409  | `CONFLICT`                | Trùng (vd. `DASHBOARD_ALREADY_EXISTS`, `DEPARTMENT_NAME_EXISTS`) |
| 422  | `BUSINESS_RULE_VIOLATION` | Vi phạm quy tắc nghiệp vụ                                        |
| 500  | `INTERNAL_ERROR`          | Lỗi không lường trước                                            |

Mã lỗi riêng của module ghi trong `docs/api/endpoints/<module>.md`, dạng `<ĐỐI_TƯỢNG>_<LỖI>`.
