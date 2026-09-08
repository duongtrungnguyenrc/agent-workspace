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
- activity history
- global activity logs

Keep the implementation deliberately small and local to the project.

## Scope Boundaries

Use local-first building blocks:

- SQLite for persistence
- a local HTTP server
- React 19, Vite, TypeScript, and Tailwind CSS utility classes for the UI
- Node.js scripts for the agent CLI and local server
- lightweight Socket.IO events for realtime UI refresh
- straightforward SQL instead of an ORM, unless the host project already uses one

Do not introduce Python, external databases, authentication, cloud services, SSE, message queues, microservices, or broad project-management features.

`vibe-kanban` stores source-ticket references and snapshots; it does not need to fetch or understand Jira, GitHub, Linear, or other external issue systems. Agents should use the source-specific skill or tool the user provides, then store the discovered snapshot on the Vibe Kanban work ticket.

## Ticket Types

Every ticket has a `type`. Keep the type set small and useful for agent planning:

```text
US
use_case
task
uat_feedback
qc_feedback
```

`US` is for user-story-shaped product requirements. `use_case` is for scenario or workflow coverage. `task` is for implementation or maintenance work. `uat_feedback` and `qc_feedback` are lightweight grouping tickets for human feedback streams that are not naturally user stories.

Use parent-child links for product-doc workflows:

```text
US ticket
  use_case ticket[]
    task ticket[]  # created/upserted when implementation is requested
```

The `task` ticket is the approval and implementation unit. Store the execution plan that needs user approval on the `task` ticket. Parent `US` and `use_case` tickets provide product context and should link to their child tickets.

Hierarchy is required only for product-doc tickets: `US` tickets are top-level and `use_case` tickets must have a `US` parent. `task` tickets may be top-level when standalone or source-ticket driven, or may be linked under `US`, `use_case`, `uat_feedback`, or `qc_feedback` when that helps review. Feedback grouping tickets may be top-level or linked under a `US`.

Story-definition workflows should stop at `US -> use_case[]`. Do not generate task tickets or execution plans while turning an idea, feature map, or product note into product documentation. Codebases drift quickly, so task tickets should be created or updated only when the user asks to implement a `US` or `use_case`; at that time the agent must scan the current codebase and create the smallest reviewable tasks with fresh execution plans.

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
- when the requested implementation target is a `US` or `use_case`, create or update child `task` tickets after source exploration and stop for review

Not allowed before task approval:

- modifying implementation code for that ticket
- beginning implementation work that changes the product or tests

If the execution plan changes after approval, set `user_reviewed` back to `false` and record an activity event. The user must approve the new plan before implementation continues.

## Ticket Content

### Source Ticket

Store optional source context without trying to synchronize with external systems. Source tickets are human-managed requirements from Jira, another Kanban board, Linear, GitHub Issues, or similar systems. Vibe Kanban tickets are agent work tickets.

```text
source_type
source_id
source_url
source_snapshot
```

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

The plan should reference the actual repository structure and explain:

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

## Activity History

Record lightweight events for important ticket actions. Useful event types include:

```text
ticket.created
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

## Persistence

Use SQLite as the only datastore. Keep the schema small and inspectable.

Suggested tables:

```text
tickets
ticket_revisions
ticket_commits
ticket_events
```

Store `parent_id` on `tickets` to link `US -> use_case[] -> task[]` when that hierarchy exists. Multiple tickets may share the same `parent_id`, so no uniqueness constraint should prevent a story from having many use cases or a use case or feedback group from having many tasks. Store revision rows when the specification or execution plan changes so approval state can be tied to the current plan.

## CLI and Agent Interface

Expose simple commands an agent can use:

```bash
vibe-kanban list
vibe-kanban get <ticket-id>
vibe-kanban create
vibe-kanban create --type use_case --parent-id <story-ticket-id>
vibe-kanban create --type task --parent-id <use-case-ticket-id>
vibe-kanban create --type task --source-type jira --source-id PROJ-123 --source-snapshot <text>
vibe-kanban create --type uat_feedback --title <feedback-group>
vibe-kanban update <ticket-id>
vibe-kanban approve <ticket-id> --description <text> --quiet
vibe-kanban start <ticket-id> --description <text> --quiet
vibe-kanban progress <ticket-id> --percent <0-100> --note <text> --description <text> --quiet
vibe-kanban progress-log <ticket-id> --step <name> --description <text> --percent <0-100> --quiet
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
```

JSON should include enough ticket, specification, plan, approval, status, Git, and event information for an agent to continue work without parsing HTML.

The `approve` and `start` commands must apply only to `task` tickets. The `start` command must enforce the approval gate: if the current execution plan is not approved, fail with a clear message and leave the ticket unchanged.

Status-changing commands should accept `--description <text|@file>` so agents can explain why a ticket moved. `progress-log` records an implementation activity after a meaningful plan step; it should require a description, optionally update `progress_percent`, record `ticket.progress_logged`, and produce no CLI output by default unless `--json` is requested.

## Local UI

The UI should provide:

- Kanban board
- ticket type badges
- search across title, type, source, branch, specification, and execution plan
- simple filters for type, status, and review state
- grouping by status, type, review state, or branch
- drag-and-drop between any status columns, with server-side target-status validation
- ticket detail view
- folder-tree hierarchy List tab for scanning `US -> use_case[] -> task[]` as nested tickets using the same filters as the Kanban board
- horizontal draggable Graph tab for visualizing `US -> use_case[] -> task[]` hierarchy with visible type-specific styling, contained viewport zoom, and enough zoom-out range for large trees
- Markdown rendering
- ticket status
- review and approval state
- task-only execution plan display and editing
- Git trace
- PR, pipeline, and action trace
- activity history
- activity logs page

Use Socket.IO for lightweight realtime refresh. Broadcast after ticket mutations:

```js
io.emit("tickets:changed", { ticket_id, status, updated_at });
```

The UI may approve task tickets and move tickets through the local API, but supported status validation and approval gating should remain in the server/CLI layer. In ticket detail views, expose status movement through a status select at the top of the page instead of rendering separate status-transition buttons.

Ticket detail should render the editable form only after the user chooses Edit. `execution_plan` is an implementation artifact and should only be displayed or edited for `task` tickets; `US` and `use_case` detail views should focus on the product specification, source metadata, hierarchy, status, activity, and trace fields.

Expose a global activity endpoint and page from server-managed ticket events. Agents should not need to call a separate command to record UI activity logs.

## Validation

When building the tool, verify the meaningful invariants:

- a new ticket starts unapproved
- implementation cannot start before plan approval
- changing the plan after approval invalidates approval
- supported status moves work in both directions
- unsupported status values fail clearly
- JSON output contains enough state for agent continuation
- the UI refreshes ticket changes through Socket.IO notifications
- Git commit records can be associated with a ticket
- seeded sample tickets cover multiple ticket types and statuses
- task progress can be updated by agent command and reflected in the UI progress bars
