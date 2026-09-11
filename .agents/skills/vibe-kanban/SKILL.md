---
name: vibe-kanban
description: Operate or extend the local Vibe Kanban tool for agent work tickets, approvals, checklist progress, evidence, and Git/PR trace.
metadata:
  short-description: Manage agent implementation tickets
---

# Vibe Kanban

Use this skill for direct Vibe Kanban CLI/API/UI operations. The tool itself is workspace infrastructure at `vibe-kanban/` (CLI in `scripts/`, local server, React UI in `ui/`, developer docs in `docs/`). Product-documentation intake belongs to `documenter`; implementation planning and execution belong to `task-implementer`. Those skills define when to create tickets, ask questions, require approval, capture source evidence, and update checklist steps.

Run the project-local CLI from the workspace root:

```bash
pnpm -s vk <command>
```

`vk` is a root `package.json` script for `node --no-warnings=ExperimentalWarning vibe-kanban/scripts/vibe-kanban.mjs`. Keep `-s` (silent) so pnpm does not echo the command line; that keeps `--quiet` calls empty and `--json` output parseable. Related scripts: `pnpm vk:serve` (local server), `pnpm vk:dev`, `pnpm vk:build`, `pnpm vk:check`.

## Tool Contract

- Ticket hierarchy: `group -> feature[] -> task[]`; standalone tasks are allowed when the owning workflow chooses them.
- Task tickets are the approval, execution-plan, progress, Git, PR, pipeline, and action trace unit.
- External source context stays on the work ticket through `source_type`, `source_id`, `source_url`, `source_snapshot`, and structured `source_evidence`; Vibe Kanban does not fetch external systems itself.
- `source_evidence` is a JSON array of `{ "type": "image" | "link", "url": "https://...", "label": "...", "description": "..." }` objects. Use `--source-evidence @file.json` for non-trivial input.
- Task execution plans use top-level Markdown checklist items (`- [ ]` at column 0). Indented checklist items are supporting detail, not steps. The tool derives ordered plan steps and preserves their state when unchanged checklist labels remain in a revised plan.
- `approve` rejects a task whose execution plan has no top-level checklist item. Rewrite prose plans as checklists before asking for approval.
- Update a step with `progress-log <id> --step <number|exact label> --step-status <pending|in_progress|completed|blocked> --description <text> --quiet`. Omit `--percent` on step updates; the tool derives `progress_percent` from completed steps. Pass `--percent` only on lifecycle milestones before the first step starts, and never lower a percent the checklist already reached.
- Task tickets carry `local_review` (`pending`, `requested`, `changes_requested`, `confirmed`, `skipped`). Agents request it with `local-review <id> --status requested --description <changed files, verification, local URL>`; users confirm in the UI or with `--status confirmed --actor user`. `add-commit` and `pr` refuse task tickets that are not `confirmed` or `skipped`; `--skip-local-review <reason>` is only for an explicit user instruction and is recorded as an event. A spec or plan change resets the state to `pending`.
- `delete` removes a ticket with its revisions, commits, and plan steps, refuses when children exist unless `--cascade` is passed, and records a `ticket.deleted` audit event. Ask the user before deleting tickets the agent did not create in the current conversation.
- Every mutation records an event. The local server emits `tickets:changed` for API and CLI writes so the UI can refresh, notify, and monitor checklist progress in real time.
- Pass `--description` on status, progress, PR, pipeline, and action changes so activity and realtime UI messages remain useful.

Run `pnpm -s vk --help` for the full command list.

## Free-Form Task Intake

Use `smart-search` before asking for related ticket IDs:

```bash
pnpm -s vk smart-search "<query>" --parent-for task --json
```

The JSON includes `kind_detection` and a `parent_suggestion` with `confidence` and up to three candidates. For a task request with no ticket id and no explicit parent, confirm with the user in one concise question that names the proposed kind and parent. A `high` confidence suggestion is the default answer; for `medium`, `low`, or no suggestion, list the candidate ids and offer a top-level task. Create with `--kind <kind> --parent-id <id>`, and omit `--parent-id` only after the user accepts a standalone task.

Common reads and trace writes:

```bash
pnpm -s vk get <id> --json
pnpm -s vk activity --limit 50 --json
pnpm -s vk progress-log <id> --step 1 --step-status in_progress --description "Started step" --quiet
pnpm -s vk local-review <id> --status requested --description @review.md --quiet
pnpm -s vk add-commit <id> --commit-hash <hash> --url <commit-url> --branch <branch> --message <message> --quiet
pnpm -s vk pr <id> --pr-url <url> --pr-status open --description "PR created" --quiet
```

## Extending The Tool

Read [vibe-kanban/docs/implementation-guide.md](../../../vibe-kanban/docs/implementation-guide.md) before changing schema, lifecycle, CLI/API behavior, realtime events, or UI. Keep the implementation local-first: SQLite, Node.js, React, Vite, Tailwind v4 with shadcn/ui components and theme tokens, and Socket.IO. Do not add external databases, authentication, queues, or source-system fetching.

The UI lives in `vibe-kanban/ui/`, builds to `vibe-kanban/assets/dist/`, supports light and dark themes, and should keep external URLs navigable, source images previewable, and checklist progress visible on ticket detail and through the floating monitor. Use existing `vibe-kanban/ui/src/components/ui/*` primitives and `tone()` helpers before adding new styling.

```bash
pnpm vk:check
pnpm vk:build
```
