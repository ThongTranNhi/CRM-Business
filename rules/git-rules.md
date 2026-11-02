# Quy tắc Git

Repo: `github.com/ThongTranU/CRM-Business`. Đổi máy → `git pull`, không copy tay.

## Branch

- `main`: luôn chạy được; Vercel tự deploy Production web khi `main` đổi (API, migration làm tay — `docs/deployment/`).
- Nhánh làm việc: `feat/<module>-<mo-ta>`, `fix/...`, `chore/...`, `docs/...`.

## Commit (Conventional Commits)

`<type>(<module>): <mô tả ngắn>`

- type: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `perf`.
- Ví dụ: `feat(tasks): kéo thả task giữa các cột`.
- Mỗi commit một thay đổi có nghĩa; không commit file `.env`, `.dev.vars`, build, `node_modules`.
- Kết thúc buổi làm việc: commit và `git push`.

## Pull request

- Theo `.github/pull_request_template.md`.
- CI (`.github/workflows/ci.yml`: format, lint, typecheck, test, build) phải xanh; `main` chỉ nhận merge qua PR.
- Có migration → ghi rõ trong PR.
