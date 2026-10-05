# Work Management — Tổng quan

Phân hệ quan trọng nhất. Cảm hứng từ Trello nhưng không sao chép giao diện.
Giao diện tham chiếu: bản demo "CRM Business Demo".

```
Company → Department → Department Dashboard → (Project) → Task → Checklist
```

## Luồng cốt lõi (không được đổi)

Phòng ban được tạo → tồn tại độc lập → cần Dashboard → người có quyền bấm **+ Tạo Dashboard** → Dashboard xuất hiện ở Workspace → vào Dashboard → **+ Thêm công việc** → giao người phụ trách → VIỆC CẦN LÀM → VIỆC ĐANG LÀM → ĐÃ HOÀN THÀNH.

## Tài liệu

| File                                               | Nội dung                                   |
| -------------------------------------------------- | ------------------------------------------ |
| [workspace.md](workspace.md)                       | Trang Workspace, tạo phòng ban + Dashboard |
| [department-dashboard.md](department-dashboard.md) | Board Kanban, lọc, tìm kiếm                |
| [task-management.md](task-management.md)           | Task, card, chi tiết, checklist, bình luận |
| [drag-and-drop.md](drag-and-drop.md)               | Kéo thả, thứ tự, optimistic update         |
| [activity-log.md](activity-log.md)                 | Lịch sử thao tác                           |

Quy tắc nghiệp vụ: BR-01 → BR-31 trong `docs/requirements/business-rules.md`.

## Bảng dữ liệu chính

`departments`, `department_members`, `department_dashboards`, `boards`, `board_columns`, `board_members`, `projects`, `project_members`, `tasks`, `task_collaborators`, `task_checklist_items`, `task_comments`, `task_attachments`, `task_tags`, `task_activities`.
