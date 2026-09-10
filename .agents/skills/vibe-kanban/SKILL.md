---
name: vibe-kanban
description: Build or operate a local-first Kanban workflow for coding-agent implementation tickets, plans, approvals, Git trace, and activity history.
metadata:
  short-description: Manage agent implementation tickets
---

# Vibe Kanban

Use this skill when creating, updating, or using the internal `vibe-kanban` workflow for coding agents. The workflow is a lightweight local tool, not a general project-management system.

## Operating Model

`vibe-kanban` exists to preserve the path from raw requirement or external source ticket to structured agent work ticket, codebase-informed execution plan, explicit user approval, implementation progress, Git commits, PR trace, pipeline trace, and action history.

Tickets are linked as a hierarchy when used with product documentation:

```text
US
  use_case[]
    task[]  # generated only when implementation is requested
```

The `task` ticket is the implementation and approval unit. Store the execution plan that requires user approval on the `task` ticket, not only on the parent story or use case.

Distinguish source tickets from Vibe Kanban work tickets:

- A source ticket is a human-managed requirement from Jira, another Kanban board, Linear, GitHub Issues, or a similar external system.
- A Vibe Kanban ticket is the agent work ticket used for planning, approval, progress, and trace.
- When the user provides one or more source tickets, first explore them with the relevant source skill or tool supplied by the user, such as a Jira fetch skill. Then create or update Vibe Kanban `task` work tickets with the discovered source fields filled in.
- Do not create a mirrored Vibe Kanban ticket just to represent the source ticket. Store the source system, id, URL, and discovered snapshot directly on the work ticket.

For product stories, keep story-building separate from implementation planning:

- Story-definition work creates or updates `US` and `use_case` tickets only.
- User-provided product notes belong to `documenter`; explicit codebase-derived bootstrap belongs to `auto-us`; implementation planning and coding belong to `task-implementer`.
- Do not pre-create `task` tickets from an idea document while the codebase is still evolving.
- When the user asks to implement a `US` or `use_case`, scan the current codebase first with CodeGraph or the available source tools, then create or update the smallest reviewable `task` tickets under the relevant `use_case` tickets.
- Generated implementation tasks start `open`, `user_reviewed = false`, and require explicit user approval before code changes.

A single `US` may have many `use_case` children. Split use cases by distinct actor-system goals, scenarios, workflow variants, business outcomes, or acceptance areas instead of forcing one broad use case per story.

Not every work ticket needs the full `US -> use_case -> task` hierarchy. A `task` may be top-level when the work is standalone or source-ticket driven. If a plausible parent exists, ask the user before linking or reorganizing it. For non-US human feedback streams, use `uat_feedback` or `qc_feedback` as optional grouping tickets at the same planning level as use cases, then place implementation tasks under them when useful.

The agent may prepare a ticket freely: inspect requirements, inspect the codebase, use CodeGraph or other source exploration tools, rewrite the implementation specification, and create or revise the execution plan. The agent must not modify implementation code for a task until the current execution plan has been explicitly reviewed and approved by the user.

If the execution plan changes after approval, invalidate the approval and request user review again before implementation continues.

## Analysis Checkpoints

When operating Vibe Kanban during product analysis, source-ticket intake, codebase inference, task generation, or execution-plan validation, stop and ask the user if the analysis exposes a material choice about user intent, ticket hierarchy, implementation slice, product behavior, UX, data contracts, integrations, permissions, or operational risk.

Do not silently encode one of several materially different interpretations into tickets. For minor naming, formatting, or local engineering assumptions that do not change scope or behavior, proceed and record the assumption in the relevant ticket.

When a ticket has unresolved questions, move it to `hold` and store the questions in `open_questions` before asking the user:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs questions <ticket-id> --questions "<markdown questions>" --description "Blocked pending user clarification" --quiet
```

If an available skill or tool can send human-facing questions through Teams, Slack, email, or another configured channel, use that skill/tool after recording `open_questions`. If no such skill/tool exists, ask in the current chat and leave the ticket on `hold`.

## Implementation Guidance

When building or substantially changing the `vibe-kanban` tool, read [references/implementation-guide.md](references/implementation-guide.md). It contains the expected ticket lifecycle, data model, CLI/API/UI behavior, approval rules, and simplicity constraints.

For ordinary operation, use [scripts/vibe-kanban.mjs](scripts/vibe-kanban.mjs) from the project root. Prefer JSON output for agent-facing reads so the agent does not need to parse HTML.

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs list
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs smart-search "<query>" --parent-for task --json
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs seed
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type US --title "<story>"
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type use_case --parent-id <story-ticket-id> --title "<use case>"
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type task --title "<task>" # top-level task is allowed when standalone or source-ticket driven
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type task --parent-id <use-case-or-feedback-id> --title "<task>"
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs get <ticket-id> --json
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs comment <task-ticket-id> --comment "<user feedback>" --actor user --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs questions <ticket-id> --questions "<markdown questions>" --description "Blocked pending user clarification" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs move <task-ticket-id> --status in_progress --description "<why status changed>" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 50 --note "<progress>" --description "<what changed>" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "<plan step>" --description "<what the agent just did>" --percent 50 --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs pr <task-ticket-id> --pr-url <url> --pr-status open --description "PR created" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs pipeline <task-ticket-id> --pipeline-status passing --pipeline-url <url> --description "CI finished" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs action-log <task-ticket-id> --action-type github-actions --status success --url <url> --description "<action result>" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs serve --port 8765
```

Use `smart-search` before asking the user to identify related tickets or parents. It searches ticket titles, source fields, raw requirements, specifications, execution plans, source snapshots, action items, and branches, then returns ranked matches with parent and child summaries. Use `--parent-for task` when looking for a valid parent for an implementation task; use `--type`, `--status`, and `--limit` to narrow results. If one parent is clearly correct from the ranked evidence, link to it; if several plausible parents remain, ask the user with the candidate ticket IDs.

The Node script uses SQLite via `node:sqlite` and stores its database at `.vibe-kanban/vibe-kanban.sqlite` by default. Override that with `VIBE_KANBAN_DB` when needed.

The UI is a React 19 + Vite + Tailwind CSS app under `ui/` and builds to `assets/dist/`. It includes default Kanban, folder-tree List, and draggable Graph tabs sharing the same board filters, plus activity logs and ticket detail pages. The Graph tab visualizes `US -> use_case[] -> task[]` ticket hierarchy with a horizontal SVG mindmap whose pan and zoom stay inside the graph viewport. Ticket detail pages should be read-focused by default: hide the edit form until the user chooses Edit, change status from a status select near the top of the page, and show or edit implementation execution plans only for `task` tickets. Keep UI styling in Tailwind utility classes and do not add handwritten CSS beyond the Tailwind entry import:

```bash
pnpm install --frozen-lockfile
pnpm --filter vibe-kanban run check
pnpm --filter vibe-kanban run build
```

The local server serves the built Vite UI and uses Socket.IO to push ticket changes to connected browsers. Activity logs are server-managed from ticket events and are visible at `/activity`; agents should update tickets normally and do not need separate activity-log commands. Do not use Python for the Vibe Kanban implementation.

Ticket detail pages include a user review comment form for pending task approval. User comments are stored in `user_comments` and activity history so the agent can revise the task or execution plan before asking for approval again.

For implementation branch checkout, scoped commits, mandatory local review before commit, GitHub CLI PR creation, and PR review, use the [task-implementer Git workflow reference](../task-implementer/references/git-workflow.md). Vibe Kanban remains the source of truth for recording branch, commit hash, PR URL, progress, and activity trace.

When an agent changes ticket status from CLI, pass `--description` to explain the reason for the transition. During implementation, use `progress-log` after each meaningful execution-plan step; it records ticket history and is quiet by default so it does not add unnecessary output to the agent turn.

Status moves are reversible between all supported statuses. Use activity history for traceability instead of blocking backward moves with a transition graph.
