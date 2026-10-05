# Bắt đầu phát triển

## Cần có

Node 22+, Git, tài khoản Supabase (project region Singapore).

## Lấy code (máy mới)

```bash
git clone https://github.com/ThongTranU/CRM-Business.git
cd CRM-Business
```

Máy đã có repo: `git pull`.

## Cài đặt

```bash
corepack enable
corepack prepare pnpm@10.18.0 --activate
pnpm install
```

## Biến môi trường

| File                  | Biến                                                                                |
| --------------------- | ----------------------------------------------------------------------------------- |
| `apps/web/.env.local` | `VITE_API_URL=http://localhost:8787`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| `apps/api/.dev.vars`  | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`                                         |

Lấy ở Supabase → Project Settings → API. **Không** dán service role key vào chat hay commit.

## Chạy

`pnpm dev` → web `http://localhost:5173`, API `http://localhost:8787/api/health`.

## Trước khi commit

`pnpm lint && pnpm typecheck`, rồi `git commit` + `git push` (đổi máy chỉ cần `git pull`).
