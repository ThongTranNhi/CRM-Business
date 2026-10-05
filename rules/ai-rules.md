# Quy tắc cho AI agent

1. Đọc `CLAUDE.md` → `rules/*` liên quan → `docs/requirements/business-rules.md` → `docs/features/<module>`.
2. Trước khi code: liệt kê file sẽ tạo/sửa + ảnh hưởng DB/API/UI/quyền/audit. Việc lớn → chờ duyệt.
3. Làm từng phần nhỏ, chỉ sửa file liên quan. Không viết lại cả module khi chỉ sửa 1 chỗ.
4. Không tạo thư mục ngoài cấu trúc (`rules/architecture-rules.md`).
5. Không cài thư viện, không đổi stack, không đổi nghiệp vụ cốt lõi khi chưa hỏi.
6. Gặp giả định → ghi rõ "[Giả định]" trong báo cáo, không âm thầm quyết.
7. Xong: rà checklist `rules/code-quality-rules.md` mục 9 cho từng file; lint + typecheck (+ test) pass; cập nhật docs liên quan.
8. Báo cáo cuối:
   - File đã tạo/sửa
   - Migration
   - Endpoint mới/đổi
   - Docs đã cập nhật
   - Việc còn lại / rủi ro / giả định cần chốt
