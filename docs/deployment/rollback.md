# Rollback

## Web (Vercel)

- Vercel → project → **Deployments** → chọn bản Production trước đó đang chạy tốt → **Promote to Production**
  (hoặc **Instant Rollback**). Không cần build lại, mất vài giây.
- Sau đó sửa lỗi bằng PR mới (hoặc `git revert` commit lỗi qua PR) — không force push `main`.

## API (Cloudflare Workers)

```bash
pnpm --filter @crm/api exec wrangler deployments list --env production
pnpm --filter @crm/api exec wrangler rollback <version-id> --env production
```

## Database (Supabase)

- Migration trong repo chỉ thêm (bảng / cột / view / hàm), nên rollback web / API về bản cũ vẫn chạy trên schema
  mới — thường **không** cần gỡ migration.
- Không tự viết lệnh `drop` trên Production. Cần gỡ thay đổi schema → viết migration mới qua PR, chủ dự án duyệt.
- Dữ liệu: gói Free không có Point-in-Time Recovery — trước migration rủi ro, sao lưu bảng liên quan (Dashboard →
  Database → Backups, hoặc `pg_dump` bảng đó).
