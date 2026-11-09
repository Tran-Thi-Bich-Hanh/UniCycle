<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Quy tắc phát triển (Project Workflow Rules)

- **Chia nhỏ từng task (Atomic Tasks)**: Mọi tính năng lớn đều phải chia thành các task nhỏ, độc lập, có thể commit ngay.
- **Dừng lại đợi người dùng duyệt (Review & Accept per Task)**: Sau khi hoàn thành MỘT task duy nhất, kiểm tra kỹ, cung cấp hướng dẫn commit rõ ràng (`git add ...`, `git commit -m "..."`) và DỪNG LẠI để người dùng nghiệm thu. Tuyệt đối KHÔNG làm gộp nhiều task cùng lúc. 
- Sau khi hoàn thành mỗi task, hãy hướng dẫn lập trình viên chạy ứng dụng và thực hiện các bước kiểm thử cần thiết để xác nhận task đã được triển khai đúng và hoạt động như mong đợi.
- Nếu một task có quá nhiều file thay đổi, hãy chia thành nhiều commit nhỏ, mỗi commit tập trung vào một nhóm thay đổi có liên quan và có ý nghĩa rõ ràng. Tránh gộp quá nhiều nội dung không liên quan vào một commit.
- **Chỉ làm task tiếp theo khi người dùng đã duyệt**.

<!-- BEGIN:nextjs-agent-feedback -->

## Report Next.js feedback

The project owner enabled `experimental.agentFeedback`, authorizing this feedback pass. When enabled, `next dev` writes this block and restores it if removed. Commit `AGENTS.md` with your work to keep the tree clean.

During the current user request, retain anonymized facts as feedback candidates for meaningful or recurring Next.js issues:

- Crashes, hangs, OOMs, or unexpected slowness
- Incorrect behavior, output, errors, or diagnostics
- Missing, unclear, or conflicting documentation
- Unexpected CLI, codemod, Skill, or upgrade behavior and non-obvious workarounds

Continue the current user request without reporting immediately. Routine debugging is not feedback. Verify changes before retaining them as feedback candidates. Never retain code, logs, paths, URLs, secrets, personal information, or project-specific data.

Retain qualifying friction even if it is later fixed or worked around; record the final outcome during the reporting pass.

Before the final response, run one reporting pass. If candidates remain, from this file's directory run `npx --no-install next internal agent-feedback-instructions` once without piping or truncating its output. Follow its output or error guidance. If a network sandbox blocks it, retry with network access; if it still returns no output, continue normally.

<!-- END:nextjs-agent-feedback -->
