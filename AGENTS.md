<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Quy tắc phát triển (Project Workflow Rules)

- **Chia nhỏ từng task (Atomic Tasks)**: Mọi tính năng lớn đều phải chia thành các task nhỏ, độc lập, có thể commit ngay.
- **Dừng lại đợi người dùng duyệt (Review & Accept per Task)**: Sau khi hoàn thành MỘT task duy nhất, kiểm tra kỹ, cung cấp hướng dẫn commit rõ ràng (`git add ...`, `git commit -m "..."`) và DỪNG LẠI để người dùng nghiệm thu. Tuyệt đối KHÔNG làm gộp nhiều task cùng lúc.
- **Chỉ làm task tiếp theo khi người dùng đã duyệt**.
