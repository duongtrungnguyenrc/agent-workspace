# Vibe Kanban Implementation Guide

## Purpose

This is a lightweight internal developer tool named `vibe-kanban` that gives coding agents a persistent Kanban workflow for implementation tickets.

The tool should help an agent and user trace an implementation through:

- raw requirement
- rewritten implementation specification
- source exploration
- execution plan
- user approval
- implementation progress
- Git commits
- pull requests
- pipelines and external actions
- user review comments
- open questions
- activity history
- global activity logs

Keep the implementation deliberately small and local to the project.

## Scope Boundaries

Use local-first building blocks:

- SQLite for persistence
- a local HTTP server
- React 19, Vite, TypeScript, and Tailwind CSS v4 for the UI, with shadcn/ui components (`radix-ui`, `class-variance-authority`, `lucide-react`, `sonner`) as the component layer and a few ReactBits pieces for motion accents
- Node.js scripts for the agent CLI and local server
- lightweight Socket.IO events for realtime UI refresh
- straightforward SQL instead of an ORM, unless the host project already uses one

Do not introduce Python, external databases, authentication, cloud services, SSE, message queues, microservices, or broad project-management features.

`vibe-kanban` stores source-ticket references and snapshots; it does not need to fetch or understand Jira, GitHub, Linear, or other external issue systems. Agents should use the source-specific skill or tool the user provides, then store the discovered snapshot on the Vibe Kanban work ticket.

## Ticket Types

Every ticket has a `type`. Keep the type set small and useful for agent planning:

```text
group
feature
task
```

`group` is the user-story level: a coherent product capability, or a UAT/QC feedback or maintenance theme that needs related tasks. `feature` is one use case: scenario or workflow coverage under a group. `task` is for implementation or maintenance work. Databases created before this type set are migrated on open (`US -> group`, `use_case -> feature`, top-level feedback groups `-> group`, nested ones `-> feature`).

### Task Kind

Tickets also carry an optional `kind` that classifies the work intent, primarily for `task` tickets:

```text
feature
bugfix
refactor
chore
docs
test
```

`kind` maps one-to-one to the Git branch prefix (`feat/`, `fix/`, `refactor/`, `chore/`, `docs/`, `test/`) and is a board filter and grouping. When a task is created without an explicit kind, the CLI and API detect it from weighted keyword signals in the title (double weight), raw requirement, specification, and source snapshot, and store the result together with `kind_source` and `kind_confidence` in the `ticket.created` event payload. Keep the detection heuristic small and transparent; the agent confirms low-confidence results with the user rather than adding more machinery.

### Free-Form Task Intake

A task requested without a ticket id or parent should be linked to the feature it belongs to. `smart-search --parent-for task` returns `kind_detection`, a `parent_suggestion` with `confidence` (`high`, `medium`, `low`) and up to three candidates, and ranked results. Ranking prefers `feature` parents for tasks, adds a bonus when every query token appears in the title, and halves cancelled tickets. The agent presents the proposed kind and parent to the user for confirmation before creating the task; a top-level task is created only after the user accepts it.

Use parent-child links for product-doc workflows:

```text
group ticket
  feature ticket[]
    task ticket[]  # created/upserted when implementation is requested
```

The `task` ticket is the approval and implementation unit. Store the execution plan that needs user approval on the `task` ticket. Parent `group` and `feature` tickets provide product context and should link to their child tickets.

Hierarchy is required only for product-doc tickets: `group` tickets are top-level and `feature` tickets must have a `group` parent. `task` tickets may be top-level when standalone or source-ticket driven, or may be linked under a `group` or `feature` when that helps review. Feedback or maintenance themes are ordinary `group` tickets (or `feature` tickets under an existing group) with tasks beneath them.

Story-definition workflows should stop at `group -> feature[]`. Do not generate task tickets or execution plans while turning an idea, feature map, or product note into product documentation. Codebases drift quickly, so task tickets should be created or updated only when the user asks to implement a `group` or `feature`; at that time the agent must scan the current codebase and create the smallest reviewable tasks with fresh execution plans.

## Ticket Lifecycle

Supported statuses:

```text
open
in_progress
hold
cancelled
in_review
closed
```

Typical flow:

```text
open -> in_progress -> in_review -> closed
```

Treat that flow as a convention, not a hard transition graph. The CLI, API, and drag-and-drop UI may move a ticket between any supported statuses because activity history records the previous status, next status, actor, timestamp, and description. Keep validation limited to whether the target status is one of the supported values.

## Approval Gate

Every ticket has a `user_reviewed` approval state that defaults to `false`. In the product-doc workflow, only `task` tickets are approved and started for implementation.

Allowed before task approval:

- inspect the ticket
- inspect the codebase
- use CodeGraph or other source exploration tools
- rewrite the raw requirement into an implementation specification
- create or revise the execution plan
- update ticket metadata and history
- when the requested implementation target is a `group` or `feature`, create or update child `task` tickets after source exploration and stop for review

Not allowed before task approval:

- modifying implementation code for that ticket
- beginning implementation work that changes the product or tests

If the execution plan changes after approval, set `user_reviewed` back to `false` and record an activity event. The user must approve the new plan before implementation continues.

Pending approval should allow user comments without approving the task. Store those comments on `user_comments` and record a `ticket.user_commented` event. When the agent has unresolved questions that block accurate planning or implementation, store them in `open_questions`, move the ticket to `hold`, and record a `ticket.questions_opened` event.

## Ticket Content

### Source Ticket

Store optional source context without trying to synchronize with external systems. Source tickets are human-managed requirements from Jira, another Kanban board, Linear, GitHub Issues, or similar systems. Vibe Kanban tickets are agent work tickets.

```text
source_type
source_id
source_url
source_snapshot
source_evidence
user_comments
open_questions
```

`source_evidence` is a JSON array of small evidence records:

```json
[
  {
    "type": "image",
    "url": "https://source-system.example/attachment.png",
    "label": "Checkout error screenshot",
    "description": "Fetched from source ticket PROJ-123"
  }
]
```

Agents fetch source content through the relevant source-system tool and store relevant image or link evidence here. The detail UI previews images and keeps evidence URLs navigable.

When a user provides one or more source tickets, the agent should fetch/explore those source tickets with the relevant user-provided skill or tool, then create or update one or more Vibe Kanban `task` work tickets. Do not create mirrored Vibe Kanban tickets solely to represent external source tickets.

### Implementation Specification

Rewrite raw requirements into a clear Markdown specification. The usual shape is:

```md
# Objective

## Context

## Requirements

## Acceptance Criteria

## Constraints

## Out of Scope
```

Extend the sections when useful, but keep the format predictable.

### Execution Plan

Create the execution plan only after the user asks for implementation and after exploring the current source code. Use the project's available exploration tools, including CodeGraph when available, to understand architecture, execution flow, dependencies, affected code, existing abstractions, side effects, test coverage, and realistic implementation scope.

Do not generate an implementation plan purely from the ticket description.

Use top-level Markdown checklist items (`- [ ]` at column 0) as ordered, monitorable steps; indented checklist items are supporting detail and are not tracked. The tool derives plan-step rows from those items, preserves status when an unchanged label remains after editing, and supports `pending`, `in_progress`, `completed`, and `blocked`. `approve` fails when a task plan has no top-level checklist item. The plan should reference the actual repository structure and explain:

- what needs to change
- why it needs to change
- relevant files or modules
- implementation order
- dependencies
- tests to add or modify
- important risks or constraints

Group the execution plan by the child projects that actually exist under `source/**`, such as backend, frontend, mobile, or other project-specific areas. Do not invent groups that are not present in the repository.

## Git Trace

Keep enough Git information to understand what was implemented without replacing Git itself.

At minimum, store:

```text
branch
base_commit
head_commit
progress_percent
pr_url
pr_number
pr_status
pipeline_status
pipeline_url
action_items
```

Track associated commits with:

```text
commit_hash
parent_hash
branch
message
author
created_at
```

## Ticket Removal

Support explicit ticket deletion from the CLI (`delete <id> [--cascade]`), the API (`POST /api/tickets/:id/delete` with `{ cascade }` or `DELETE /api/tickets/:id?cascade=true`), and the ticket detail page behind a confirmation dialog.

- Refuse to delete a ticket that still has child tickets unless cascade is requested; cascade removes the whole subtree, children first.
- Before removing each ticket, record a `ticket.deleted` event whose payload snapshots `title`, `type`, `kind`, `status`, `parent_id`, `children_deleted`, and the optional description.
- Delete the ticket row plus its revisions and commits, but keep `ticket_events` rows so the activity log remains a complete audit trail. Activity queries left-join `tickets` and expose `ticket_exists`; deleted entries fall back to the snapshot values for title, type, kind, and status.

## Activity History

Record lightweight events for important ticket actions. Useful event types include:

```text
ticket.created
ticket.deleted
ticket.updated
ticket.spec_updated
ticket.plan_created
ticket.plan_updated
ticket.approval_invalidated
ticket.approved
ticket.implementation_started
ticket.progress_updated
ticket.progress_logged
ticket.status_changed
ticket.commit_added
ticket.pr_updated
ticket.pipeline_updated
ticket.action_logged
ticket.user_commented
ticket.questions_opened
ticket.review_requested
ticket.closed
```

Each event should contain:

```text
ticket_id
type
actor
payload
created_at
```

The global activity endpoint is cursor-paginated by event id: `GET /api/activity?limit=<1-200>&before=<event-id>` returns `{ events, has_more, next_cursor }` newest first, and the CLI mirrors it with `activity --limit <n> --before <event-id>`. Each activity row joins the current ticket title, type, kind, and status and includes `ticket_exists`.

## Persistence

Use SQLite as the only datastore. Keep the schema small and inspectable.

Suggested tables:

```text
tickets
ticket_revisions
ticket_commits
ticket_events
ticket_plan_steps
```

Store `parent_id` on `tickets` to link `group -> feature[] -> task[]` when that hierarchy exists. Multiple tickets may share the same `parent_id`, so no uniqueness constraint should prevent a group from having many features or a feature or group from having many tasks. Store revision rows when the specification or execution plan changes so approval state can be tied to the current plan.

## CLI and Agent Interface

Expose simple commands an agent can use:

```bash
vibe-kanban list
vibe-kanban smart-search "<query>" --parent-for task --json
vibe-kanban smart-search "<query>" --type task --kind bugfix --json
vibe-kanban detect-kind "<text>" --json
vibe-kanban get <ticket-id>
vibe-kanban create
vibe-kanban create --type feature --parent-id <group-ticket-id>
vibe-kanban create --type task --kind bugfix --parent-id <feature-ticket-id>
vibe-kanban create --type task --source-type jira --source-id PROJ-123 --source-snapshot <text>
vibe-kanban create --type group --title <feedback-group>
vibe-kanban update <ticket-id> --kind <kind>
vibe-kanban delete <ticket-id> --description <text> --quiet
vibe-kanban delete <ticket-id> --cascade --description <text> --quiet
vibe-kanban activity --limit 50 --before <event-id> --json
vibe-kanban approve <ticket-id> --description <text> --quiet
vibe-kanban comment <ticket-id> --comment <text> --actor user --quiet
vibe-kanban questions <ticket-id> --questions <text> --description <text> --quiet
vibe-kanban start <ticket-id> --description <text> --quiet
vibe-kanban progress <ticket-id> --percent <0-100> --note <text> --description <text> --quiet
vibe-kanban progress-log <ticket-id> --step <name|number> --step-status <pending|in_progress|completed|blocked> --description <text> --percent <0-100> --quiet
vibe-kanban hold <ticket-id> --description <text> --quiet
vibe-kanban review <ticket-id> --description <text> --quiet
vibe-kanban close <ticket-id> --description <text> --quiet
vibe-kanban pr <ticket-id> --pr-url <url> --pr-status <status> --description <text> --quiet
vibe-kanban pipeline <ticket-id> --pipeline-status <status> --pipeline-url <url> --description <text> --quiet
vibe-kanban action-log <ticket-id> --action-type <type> --status <status> --url <url> --description <text> --quiet
vibe-kanban events <ticket-id>
```

Support JSON output for agent-facing reads:

```bash
vibe-kanban get <ticket-id> --json
vibe-kanban smart-search "<query>" --json
```

JSON should include enough ticket, specification, plan, approval, status, Git, and event information for an agent to continue work without parsing HTML.

`smart-search` is a read-only agent discovery command. It should rank tickets by matches across title, source fields, raw requirement, specification, execution plan, source snapshot, action items, and branch. Results should include the matched ticket summary plus parent and child summaries so agents can find related context without needing multiple follow-up reads. The JSON output is an object: `{ query, kind_detection, parent_for, parent_suggestion, results }`. Support `--parent-for <type>` to return only tickets that are valid parents for that ticket type and to populate `parent_suggestion`, such as `--parent-for task` when the agent is deciding where to link an implementation task. Also support `--type`, `--kind`, `--status`, and `--limit` for focused lookup. The same search is available to the UI as `GET /api/search?q=<text>&parent_for=task`.

`detect-kind` exposes the kind heuristic on its own so an agent can classify a request before creating a ticket.

The `approve` and `start` commands must apply only to `task` tickets. The `start` command must enforce the approval gate: if the current execution plan is not approved, fail with a clear message and leave the ticket unchanged.

The `comment` command appends a timestamped user comment and should not change approval state by itself. The `questions` command replaces the current open questions, moves the ticket to `hold`, and preserves the blocking questions for the user and agent. Agents should use any available human-notification skill or tool after writing open questions; if none exists, the current conversation is the fallback notification channel.

Status-changing commands should accept `--description <text|@file>` so agents can explain why a ticket moved. `progress-log` records implementation activity, optionally updates a derived checklist step, records `ticket.progress_logged`, and produces no CLI output by default unless `--json` is requested. When `--step-status` is given without `--percent`, `progress_percent` is recomputed as completed steps over total steps.

## Local UI

The UI should provide:

- Kanban board
- ticket type and kind badges
- search across title, type, kind, source, branch, specification, and execution plan
- simple filters for type, kind, status, and review state
- grouping by status, type, kind, review state, branch, or parent
- ticket creation with an optional kind (auto-detected for tasks when left blank)
- confirmed ticket deletion from the detail page, with cascade when children exist
- drag-and-drop between any status columns, with server-side target-status validation
- ticket detail view
- folder-tree hierarchy List tab for scanning `group -> feature[] -> task[]` as nested tickets using the same filters as the Kanban board
- horizontal draggable Graph tab for visualizing `group -> feature[] -> task[]` hierarchy with visible type-specific styling, contained viewport zoom, and enough zoom-out range for large trees
- Markdown rendering
- ticket status
- review and approval state
- pending-approval user comment form
- open questions
- task-only execution plan display and editing
- Git trace
- PR, pipeline, and action trace
- activity history
- activity logs page with cursor-based infinite scroll (50 events per page, newest first, older pages fetched with `before`)
- realtime notifications that name the event, ticket code, title, type, kind, actor, and change details, and open the ticket on click

Use Socket.IO for lightweight realtime refresh. The server keeps the id of the last emitted event and, after every API mutation and on every SQLite file change (CLI writes), emits one message per new `ticket_events` row:

```js
io.emit("tickets:changed", {
  id,
  ticket_id,
  type,
  actor,
  payload,
  created_at,
  ticket_exists,
  ticket_title,
  ticket_type,
  ticket_kind,
  ticket_status,
  source: "api" | "sqlite",
});
```

Because every mutation writes an event, the event tail is the only notification source; API and CLI changes never double-emit. The UI shows a toast per event, debounces the board refresh, and returns to the board when the currently opened ticket is deleted elsewhere.

The UI may approve task tickets and move tickets through the local API, but supported status validation and approval gating should remain in the server/CLI layer. In ticket detail views, expose status movement through a status select at the top of the page instead of rendering separate status-transition buttons.

Ticket detail should render the editable form only after the user chooses Edit. `execution_plan` is an implementation artifact and should only be displayed or edited for `task` tickets; `group` and `feature` detail views should focus on the product specification, source metadata, hierarchy, status, activity, and trace fields.

Expose a global activity endpoint and page from server-managed ticket events. Agents should not need to call a separate command to record UI activity logs.

### UI Stack

- `components.json` at the package root configures shadcn/ui (`new-york` style, Tailwind v4 CSS variables, `@/` alias to `ui/src`). Add primitives with `pnpm dlx shadcn@latest add <name>` from `vibe-kanban/`; generated files must import `cn` from `@/lib/utils`, not from a third-party `cn` package.
- Theme tokens live in `ui/src/styles.css` as light and `.dark` CSS variables mapped through `@theme inline`. This is the only handwritten CSS; everything else stays in Tailwind utility classes. `next-themes` toggles `.dark` on the root element with system detection.
- Ticket tones (type, kind, status) live in `ui/src/lib/styles.ts` as `Tone` keys with light and dark class sets. Use `tone(name).badge|fill|accent|text|soft` instead of inlining color classes.
- ReactBits components are vendored under `ui/src/components/reactbits/` (`CountUp` for stat tiles, `SpotlightCard` for ticket cards, adapted to theme tokens). Add new ReactBits pieces with `pnpm dlx shadcn@latest add https://reactbits.dev/r/<Name>-TS-TW.json`, then adapt hardcoded colors to tokens.
- Notifications use `sonner`; create and edit forms open in `Sheet` side panels; destructive confirmation uses `AlertDialog`; ticket detail groups content in `Tabs` (Overview, Plan, Delivery, Activity).

## Validation

When building the tool, verify the meaningful invariants:

- a new ticket starts unapproved
- implementation cannot start before plan approval
- changing the plan after approval invalidates approval
- pending approval accepts user comments without approving the task
- open questions move the ticket to hold and remain visible on detail pages
- supported status moves work in both directions
- unsupported status values fail clearly
- JSON output contains enough state for agent continuation
- the UI refreshes ticket changes through Socket.IO notifications
- Git commit records can be associated with a ticket
- seeded sample tickets cover multiple ticket types and statuses
- task progress can be updated by agent command and reflected in the UI progress bars
- a task created without `--kind` receives a detected kind and the created event records the detection source
- `smart-search --parent-for task` ranks a matching use case above its parent story and returns a parent suggestion with confidence
- deleting a ticket with children fails without cascade, succeeds with cascade, and keeps `ticket.deleted` events in the activity log
- the activity endpoint paginates by cursor without gaps or duplicates
- CLI mutations reach connected browsers as full event notifications without duplicate emissions
