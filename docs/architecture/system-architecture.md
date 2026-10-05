# Kiến trúc hệ thống

```
┌──────────────────────┐   HTTPS JSON (Bearer JWT)   ┌────────────────────────────┐
│ apps/web             │ ──────────────────────────▶ │ apps/api                   │
│ React + Vite (SPA)   │                             │ Hono @ Cloudflare Workers  │
│ Netlify              │                             │ request-id → cors → auth → │
└─────────┬────────────┘                             │ permission → module → error│
          │ Auth · Storage upload · Realtime          └─────────────┬──────────────┘
          ▼                                                         │ service role
┌──────────────────────────────────────────────────────────────────▼──────────────┐
│ Supabase (Singapore): Postgres + RLS · Auth · Storage · Realtime                  │
└───────────────────────────────────────────────────────────────────────────────────┘
```

| Thành phần | Trách nhiệm                                                                |
| ---------- | -------------------------------------------------------------------------- |
| Web        | Giao diện, cache dữ liệu (React Query), optimistic update                  |
| API        | Nghiệp vụ, phân quyền, validate, activity/audit log — **mọi thao tác ghi** |
| Supabase   | Lưu trữ, xác thực, file, realtime; RLS là lớp phòng thủ thứ hai            |

Chi tiết: `frontend-architecture.md`, `backend-architecture.md`, `auth-architecture.md`, `permission-model.md`, `deployment-architecture.md`.
