# Quy tắc Git

Repo: `github.com/ThongTranU/CRM-Business`. Đổi máy → `git pull`, không copy tay.

## Branch

- `main`: luôn chạy được, deploy production.
- Nhánh làm việc: `feat/<module>-<mo-ta>`, `fix/...`, `chore/...`, `docs/...`.

## Commit (Conventional Commits)

`<type>(<module>): <mô tả ngắn>`

- type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.
- Ví dụ: `feat(tasks): kéo thả task giữa các cột`.
- Mỗi commit một thay đổi có nghĩa; không commit file `.env`, `.dev.vars`, build, `node_modules`.
- Kết thúc buổi làm việc: commit và `git push`.

## Pull request

- Theo `.github/pull_request_template.md`.
- CI (lint, typecheck, test) phải xanh.
- Có migration → ghi rõ trong PR.
