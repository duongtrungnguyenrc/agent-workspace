# Vibe Kanban Product Documentation Templates

Use these templates as Vibe Kanban ticket content. They are not local file templates.

## `US` Ticket Specification

```markdown
# User Story

As a <actor>, I want <capability>, so that <outcome>.

## Context

- <product context>
- <user or business problem>

## Goals

- <goal>

## Use Cases

- <Verb Noun>: <one-line goal>
- <Verb Noun>: <one-line goal>
- <Verb Noun>: <one-line goal>

## Acceptance Criteria

- AC-001: Given <context>, when <action>, then <expected result>.

## Constraints

- <product, business, UX, data, or technical constraint>

## Out of Scope

- <explicit non-goal>

## Open Questions

- <question or decision needed>

## Assumptions

- <assumption made because source material was incomplete>
```

## `use_case` Ticket Specification

```markdown
# <Verb Noun>

## Context

- User Story: <story summary>
- Actor: <primary actor>
- Goal: <what the actor wants to achieve>

## Preconditions

- <required user/session/data/system condition>

## Trigger

- <event that starts the use case>

## Main Flow

1. <Actor> <does a meaningful action>.
2. System <responds with visible or meaningful behavior>.
3. <Actor> <continues the task>.
4. System <validates, records, calculates, routes, or displays the outcome>.

## Alternative Flows

- A1. <valid alternate path>
  1. <step>
  2. <system response>

## Exception Flows

- E1. <failure condition>
  1. System <detects or receives the failure>.
  2. System <prevents inconsistent state, rolls back, retries, or reports the error>.
  3. System <shows a useful message or recovery action>.

## Postconditions

- <system state after success>
- <important persisted data or status>

## Business Rules

- BR-001: <business rule>

## Acceptance Criteria

- AC-001: Given <context>, when <action>, then <expected result>.

## Open Questions

- <question or decision needed>

## Assumptions

- <assumption made because source material was incomplete>
```

## `task` Ticket Specification

Use task templates only when implementation has been requested and the current codebase has been explored, or when the user gives source tickets that should become agent work tickets with implementation plans. Do not create task tickets during story-building from idea documents.

```markdown
# Implementation Task

## Product Context

- User Story: <story summary>
- Use Case: <Verb Noun>
- Scenario: <concrete path or implementation slice>

## Objective

- <implementation objective>

## Acceptance Criteria

- <behavior or verification target>

## Constraints

- <scope, compatibility, data, UX, or integration constraint>

## Out of Scope

- <explicit non-goal>
```

## `task` Execution Plan

Create this only after enough source exploration to produce a grounded plan. Group by child projects that actually exist under `source/**`, such as `source/backend`, `source/frontend`, or `source/mobile`. If source exploration is not sufficient, leave the task `execution_plan` empty or mark it as requiring exploration instead of inventing file paths or implementation steps.

```markdown
# Execution Plan

## source/<child-project>

Files:

- <path>

Changes:

- <change>

Tests:

- <test or verification>

Risks:

- <risk or constraint>
```

## `uat_feedback` / `qc_feedback` Ticket Specification

Use feedback group tickets when human-managed feedback is not naturally a user story but needs related implementation tasks.

```markdown
# <UAT or QC Feedback Group>

## Source Context

- Source system: <jira|kanban|linear|github|other>
- Source tickets: <ids or links>
- Discovered summary: <what the source material says>

## Feedback Theme

- <shared behavior, screen, defect class, or acceptance gap>

## Work Tickets

- <task title>: <implementation objective>

## Open Questions

- <question needing product, QA, or stakeholder decision>
```

## Content Guidance

- Keep product-facing docs in `US` and `use_case` ticket specifications.
- List every distinct use case in the `US` ticket specification, then create a separate `use_case` child ticket for each item in that list.
- A single `US` may have many `use_case` children; split them by distinct actor intent, workflow, business outcome, or acceptance area.
- During story-building, stop at `US -> use_case[]`.
- Keep task context in `task` ticket specifications only after implementation is requested.
- Keep approval-required implementation plans in `task` ticket `execution_plan` fields only after source exploration.
- For external source tickets, fetch/explore the source with the relevant user-provided skill first, then store `source_type`, `source_id`, `source_url`, and `source_snapshot` on the Vibe Kanban work ticket. Do not mirror source tickets as separate Vibe Kanban tickets.
- Use top-level `task`, `uat_feedback`, or `qc_feedback` tickets when source-ticket-driven work is not naturally part of a `US/use_case` hierarchy. Ask the user before linking a standalone task to an existing parent.
- Do not create local `documents/**`, `document.md`, product-doc `progress.md`, `.agents/processes/**/plan.md`, or `.agents/processes/**/progress.md` files as part of this skill.
- Use Vibe Kanban task ticket progress, events, commits, branch, PR, pipeline, action items, and action events for implementation trace.
- Use Vibe Kanban IDs and parent-child links as the durable navigation structure.
