---
name: documenter
description: Create and update product stories, use cases, feedback groups, and work-ticket documentation directly in Vibe Kanban.
---

# Documenter

Use this skill when the user asks to create, organize, or update product documentation, user stories, use cases, scenarios, requirements, acceptance criteria, or story planning.

Use `documenter` for user-provided product requirements. If the user explicitly asks to infer or bootstrap stories from an existing codebase, use `auto-us` instead so CodeGraph-driven feature discovery happens first.

All product documentation for this workflow lives in Vibe Kanban tickets. Do not create, update, or manage `documents/**`, `document.md`, product-doc `progress.md`, `.agents/processes/**/plan.md`, or `.agents/processes/**/progress.md` files for story work.

## Vibe Kanban As The Document Store

Use the project-local Vibe Kanban tool from the project root:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs <command>
```

Model product documentation as linked tickets:

```text
US
  use_case[]
    task[]  # created/upserted later when implementation is requested
```

- Create one `US` ticket for the high-level user story.
- Create multiple `use_case` tickets under the same `US` ticket when the story contains multiple actor-system goals, scenarios, workflow variants, business capabilities, or acceptance areas.
- Create one `use_case` ticket under the `US` ticket for each distinct actor-system goal. Do not collapse unrelated goals into a single broad use case just because they belong to the same story.
- Store product documentation Markdown in ticket `specification`.
- Do not create implementation `task` tickets or execution plans during story-building from product notes or ideas.
- When the user later asks to implement a `US` or `use_case`, the implementer scans the current codebase and creates or updates task tickets under the relevant use cases.
- Use source fields only for external references or imported raw input, not for local doc paths.
- Do not change implementation code during story-building work.

Distinguish source tickets from agent work tickets. If the user provides Jira, external Kanban, Linear, GitHub Issue, or other human-managed ticket references, use the source-specific skill or tool supplied by the user to fetch/explore them first. Store the discovered source system, id, URL, and snapshot directly on the Vibe Kanban work ticket fields. Do not create a separate Vibe Kanban ticket solely to mirror the external source ticket.

Not every request needs a `US -> use_case` hierarchy. Use `US/use_case` for product stories and user-facing capabilities. If the user is organizing UAT feedback, QC feedback, technical maintenance, or standalone source-ticket-driven work, ask before forcing it into a user story. Use top-level `task`, `uat_feedback`, or `qc_feedback` tickets when that better represents the user's source material.

## Analysis Checkpoints

During story analysis, stop and ask the user before creating or updating tickets when the source material contains materially different possible intents, conflicting actors or goals, unclear ticket hierarchy, acceptance criteria that could change product behavior, or open product/UX/data questions that would make the story misleading.

Ask one concise question that names the tradeoff or options. If the uncertainty is minor and does not affect product meaning, proceed with a documented assumption in the ticket `specification` instead of blocking.

When the question belongs to an existing ticket, record it with `node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs questions <ticket-id> --questions "<markdown questions>" --description "Blocked pending user clarification" --quiet` so the ticket moves to `hold`. If a human-notification skill/tool is available, trigger it after recording the questions; otherwise ask in the current chat.

## Create Story Workflow

1. Normalize the user's raw notes into a concise product story structure.
2. Identify the distinct use cases inside the story before creating tickets. A single `US` commonly has many `use_case` children; create as many as needed for clear review and implementation planning.
3. Create the `US` ticket first:

   ```bash
   node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type US --title "<story title>" --specification "<story markdown>"
   ```

4. Create each `use_case` ticket under the `US` ticket. Reuse the same `<us-ticket-id>` for every use case that belongs to that story:

   ```bash
   node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type use_case --parent-id <us-ticket-id> --title "<Verb Noun>" --specification "<use case markdown>"
   ```

5. Return the created ticket IDs and hierarchy to the user. Group the response by `US -> use_case[]`; do not include `task[]` unless task tickets already existed before the story update.
6. Do not implement code during this workflow.

Task tickets are intentionally deferred. If the user asks to execute a `US` or `use_case`, switch to the implementation workflow: scan the current project, then create or update the smallest reviewable `task` tickets with execution plans for approval. Actual code changes, branch checkout, commits, local review before PR, and GitHub CLI PR creation belong to `task-implementer` plus `git-workflow`, not the story-building workflow.

If the user asks to update existing story docs, read the relevant Vibe Kanban ticket tree with `get <id> --json`, then update ticket fields through Vibe Kanban. Preserve existing parent-child links unless the user asks to reorganize the story. If an approved task execution plan changes, tell the user the task must be reviewed again before implementation.

When updating or reorganizing existing tickets, use Vibe Kanban `smart-search` to find related stories, use cases, source ids, and likely parents before asking the user for IDs. Ask only when several plausible matches remain.

## Writing Standard

Follow the use case standard from the user's reference:

- Name use cases with `Verb + Noun`, such as `Create Invoice`, `Approve Order`, or `Reset Password`.
- Split use cases by distinct actor intent or system outcome. Prefer several focused use cases under one `US` over one oversized use case with unrelated flows.
- Focus on what the actor and system do, not implementation details such as service names, repositories, database tables, or framework calls.
- Write main flows as meaningful steps alternating between actor action and system response where applicable.
- Separate valid business alternatives from exceptions. Alternative flows still complete or redirect the business goal; exception flows describe failure or inability to complete.
- Keep business rules separate when they are reusable, complex, or referenced by multiple steps.

## Templates

Read [references/templates.md](references/templates.md) when writing ticket `specification` or task `execution_plan` content.
