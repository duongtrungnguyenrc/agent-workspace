---
name: documenter
description: Create and update product group (user story) and feature (use case) tickets and work-ticket documentation directly in Vibe Kanban.
---

# Documenter

Use this skill when the user asks to create, organize, or update product documentation, user stories, use cases, scenarios, requirements, acceptance criteria, or story planning.

Use `documenter` for user-provided product requirements. If the user explicitly asks to infer or bootstrap stories from an existing codebase, use `doc-collector` instead so CodeGraph-driven feature discovery happens first.

All product documentation for this workflow lives in Vibe Kanban tickets. Do not create, update, or manage `documents/**`, `document.md`, product-doc `progress.md`, `.agents/processes/**/plan.md`, or `.agents/processes/**/progress.md` files for story work.

## Vibe Kanban As The Document Store

Use the project-local Vibe Kanban tool from the project root:

```bash
pnpm -s vk <command>
```

Model product documentation as linked tickets:

```text
group
  feature[]
    task[]  # created/upserted later when implementation is requested
```

- Create one `group` ticket for the high-level user story.
- Create multiple `feature` tickets under the same `group` ticket when the story contains multiple actor-system goals, scenarios, workflow variants, business capabilities, or acceptance areas.
- Create one `feature` ticket under the `group` ticket for each distinct actor-system goal. Do not collapse unrelated goals into a single broad feature just because they belong to the same group.
- Store product documentation Markdown in ticket `specification`.
- Do not create implementation `task` tickets or execution plans during story-building from product notes or ideas.
- When the user later asks to implement a `group` or `feature`, the implementer scans the current codebase and creates or updates task tickets under the relevant features.
- Use source fields only for external references or imported raw input, not for local doc paths.
- Do not change implementation code during story-building work.

Distinguish source tickets from agent work tickets. If the user provides Jira, external Kanban, Linear, GitHub Issue, or other human-managed ticket references, read them first through the fitting plugin skill (for example `github-source`) or the tool the user supplies; if none fits, ask the user for the content. Preserve the source material, not only an agent-written summary:

- Store the source system, id, canonical URL, and a concise text snapshot on the Vibe Kanban work ticket.
- Capture useful evidence exposed by the source tool, including screenshots, attached images, design references, logs, documents, and supporting URLs.
- Fetch image or attachment metadata/content when the source tool supports it and the evidence affects requirements or acceptance criteria. Do not invent inaccessible evidence or embed credentials.
- Store evidence with `--source-evidence <json|@file>` as an array of `{ "type": "image" | "link", "url": "https://...", "label": "...", "description": "..." }` objects. Keep provenance clear in the label or description.
- Do not create a separate Vibe Kanban ticket solely to mirror the external source ticket.

Not every request needs a `group -> feature` hierarchy. Use `group/feature` for product stories and user-facing capabilities. If the user is organizing UAT feedback, QC feedback, technical maintenance, or standalone source-ticket-driven work, ask before forcing it into a user story. Use a feedback-themed top-level `group` or top-level `task` tickets when that better represents the user's source material. Before recording a task-shaped item as top-level, run `smart-search "<title>" --parent-for task --json` and confirm the suggested parent and detected `kind` with the user, as described in the Vibe Kanban skill under "Free-Form Task Intake".

## Analysis Checkpoints

During story analysis, stop and ask the user before creating or updating tickets when the source material contains materially different possible intents, conflicting actors or goals, unclear ticket hierarchy, acceptance criteria that could change product behavior, or open product/UX/data questions that would make the story misleading.

Ask one concise question that names the tradeoff or options. If the uncertainty is minor and does not affect product meaning, proceed with a documented assumption in the ticket `specification` instead of blocking.

When the question belongs to an existing ticket, classify it by who must answer (`requirement` for BA / Product Owner, `design` for Designer / UX, `technical` for Tech Lead / Developers, `operations` for DevOps / Admin / PM) and record each category with `pnpm -s vk questions <ticket-id> --category <c> --questions @file --description "Blocked pending clarification" --quiet` so the ticket moves to `hold`. Story work mostly produces `requirement` and `design` questions: write them in product language with no code evidence; the command rejects paths, identifiers, and implementation terms in those categories. Then consider the installed skills that can carry questions to humans; ask the user in one question whether to send through the fitting plugin (name it and the channel) or answer here, record the outcome with `action-log --action-type plugin:<name>`, and ask in the current chat when nothing fits or the user declines.

## Create Story Workflow

1. Normalize the user's raw notes into a concise product story structure.
2. Identify the distinct features (use cases) inside the story before creating tickets. A single `group` commonly has many `feature` children; create as many as needed for clear review and implementation planning.
3. Create the `group` ticket first:

   ```bash
   pnpm -s vk create --type group --title "<story title>" --specification "<story markdown>"
   ```

4. Create each `feature` ticket under the `group` ticket. Reuse the same `<group-ticket-id>` for every feature that belongs to that group:

   ```bash
   pnpm -s vk create --type feature --parent-id <group-ticket-id> --title "<Verb Noun>" --specification "<feature markdown>"
   ```

5. Return the created ticket IDs and hierarchy to the user. Group the response by `group -> feature[]`; do not include `task[]` unless task tickets already existed before the story update.
6. Do not implement code during this workflow.

Task tickets are intentionally deferred. If the user asks to execute a `group` or `feature`, switch to the implementation workflow: scan the current project, then create or update the smallest reviewable `task` tickets with execution plans for approval. Actual code changes, branch checkout, commits, local review before PR, and GitHub CLI PR creation belong to `task-implementer`, not the story-building workflow.

If the user asks to update existing story docs, read the relevant Vibe Kanban ticket tree with `get <id> --json`, then update ticket fields through Vibe Kanban. Preserve existing parent-child links unless the user asks to reorganize the story. If an approved task execution plan changes, tell the user the task must be reviewed again before implementation.

When the story originates from an external source ticket, pass the captured source fields and evidence on create/update. Prefer `@file` for non-trivial JSON so shell quoting does not corrupt URLs or descriptions.

When updating or reorganizing existing tickets, use Vibe Kanban `smart-search` to find related groups, features, source ids, and likely parents before asking the user for IDs. Ask only when several plausible matches remain.

## Writing Standard

Follow the use case standard from the user's reference:

- Name use cases with `Verb + Noun`, such as `Create Invoice`, `Approve Order`, or `Reset Password`.
- Split use cases by distinct actor intent or system outcome. Prefer several focused use cases under one `group` over one oversized use case with unrelated flows.
- Focus on what the actor and system do, not implementation details such as service names, repositories, database tables, or framework calls.
- Write main flows as meaningful steps alternating between actor action and system response where applicable.
- Separate valid business alternatives from exceptions. Alternative flows still complete or redirect the business goal; exception flows describe failure or inability to complete.
- Keep business rules separate when they are reusable, complex, or referenced by multiple steps.

## Templates

Read [references/templates.md](references/templates.md) when writing ticket `specification` or task `execution_plan` content.
