# AGENTS.md

## Project Control Plane

Canonical project-local skills live under `.agents/skills/`; setup may link them into agent-specific skill folders. Vibe Kanban is a core part of this workspace, not a skill: its CLI, local server, and UI live at `vibe-kanban/`, its data at `.vibe-kanban/vibe-kanban.sqlite`, and it is the source of truth for product documentation, implementation plans, approval, progress, questions, Git/PR/pipeline trace, and activity history.

Before project analysis or implementation, read `PROJECTS.md` when it exists and follow its project-specific rules.

Implementation execution is scoped to `root-workspace/source/**`. Do not modify files outside that scope unless the approved work explicitly requires workspace configuration, workflow, documentation, or another supporting change.

## Workflow Routing

- Product stories, use cases, scenarios, requirements, acceptance criteria, and source-ticket product documentation: use `.agents/skills/documenter/SKILL.md`.
- Explicit codebase-to-story inference: use `.agents/skills/doc-collector/SKILL.md`.
- Implementation intake, task planning, approval, execution progress, verification, Git, and PR workflow: use `.agents/skills/task-implementer/SKILL.md`.
- Direct Vibe Kanban operation (CLI/API/UI): use `.agents/skills/vibe-kanban/SKILL.md`.
- Vibe Kanban tool development (schema, CLI, server, UI): read `vibe-kanban/docs/implementation-guide.md` first; the tool is workspace infrastructure, so changes there are not gated by a task ticket unless the user asks for one.
- React UI and reusable-component guidance is routed by `.agents/skills/task-implementer/SKILL.md` through its conditional references.
- Blocking questions for humans (reasoning, audience classification, recording on the ticket, sending through channel skills after the developer confirms): use `.agents/skills/clarifier/SKILL.md`.
- Existing design-language extraction: use `.agents/skills/design-collector/SKILL.md`.
- Any other skill under `.agents/skills/` is a plugin considered at decision points; see Mandatory Invariants.

Run Vibe Kanban from the workspace root (`vk` is the root `package.json` script for the CLI; keep `-s` so pnpm output stays clean):

```bash
pnpm -s vk <command>
```

Use `smart-search` before asking the user for related ticket or parent IDs:

```bash
pnpm -s vk smart-search "<query>" --parent-for task --json
```

## Mandatory Invariants

- Ticket hierarchy is `group -> feature[] -> task[]`; story-building stops at `group -> feature[]`, while implementation creates or updates task tickets from the current source state.
- A Vibe Kanban task is the implementation and approval unit. Do not modify implementation code until its current checklist execution plan is explicitly approved. A plan change invalidates approval.
- Preserve external source context and relevant evidence, including fetched images and supporting URLs, on the work ticket as defined by `documenter` and `task-implementer`; do not mirror source tickets as separate Vibe Kanban tickets.
- During product analysis or implementation planning, stop before changing tickets when a decision changes intent, scope, UX, data contracts, integration ownership, risk, or hierarchy. Record blocking questions on the affected ticket and move it to `hold` before asking the user.
- For structural source questions, use CodeGraph first. Use text search for literals or after identifying a file. Record the fallback when CodeGraph is unavailable.
- Keep execution plans, checklist-step state, progress, decisions, verification, branch, commits, PR, pipeline, and external actions in Vibe Kanban. Do not create local process/progress Markdown files.
- Implementation work uses a conventional branch from `develop` and follows `.agents/skills/task-implementer/references/git-workflow.md`. Stop after focused verification for mandatory local user review before committing.
- Keep unrelated user changes intact and commit only files belonging to the approved work.
- Every skill under `.agents/skills/` is a plugin. There is no registry or schema: the `SKILL.md` frontmatter `name` and `description` are the whole contract. At a decision point (external source tickets, blocking questions for humans, notifications, code exploration, UI design context, review, delivery), read the installed skills, pick the ones that fit the situation and `PROJECTS.md`, and confirm with the user in one question before triggering any that reaches a human channel or external system. Record what ran on the ticket with `action-log --action-type plugin:<name>`; when nothing fits or the user declines, fall back to the current chat and continue.
