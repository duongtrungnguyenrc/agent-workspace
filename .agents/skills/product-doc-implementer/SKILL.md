---
name: product-doc-implementer
description: Turn Vibe Kanban or external source tickets into approval-ready task tickets, then implement approved Vibe Kanban tasks.
---

# Product Doc Implementer

Use this skill when the user asks to implement a Vibe Kanban `US`, `use_case`, `task`, feedback group ticket, or one or more external source tickets. Vibe Kanban is the source of truth for agent work tickets, generated implementation tasks, approved execution plans, implementation progress, Git trace, PR state, pipeline state, and action history.

Use the `git-workflow` skill for branch checkout, commit discipline, local review before PR, GitHub CLI PR creation, and PR review. This skill decides what to implement; `git-workflow` decides how Git and GitHub state should be managed.

Do not require, read, create, or maintain `documents/**`, `document.md`, product-doc `progress.md`, `.agents/processes/**/plan.md`, or `.agents/processes/**/progress.md` files for implementation planning, product context, progress, or trace.

## Source Of Truth

Read the task ticket with JSON output:

```bash
node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs get <task-ticket-id> --json
```

Use the ticket tree as product context:

```text
US ticket
  use_case ticket
    task ticket[]  # generated/upserted when implementation is requested

uat_feedback or qc_feedback ticket
  task ticket[]

task ticket  # may be top-level for standalone or source-ticket-driven work
```

- `US` ticket `specification`: high-level user story and product goals.
- `use_case` ticket `specification`: actor-system behavior, flows, rules, and acceptance criteria.
- `task` ticket `specification`: implementation task context created after current codebase exploration.
- `task` ticket `execution_plan`: implementation plan that must be approved before coding.
- `task` ticket status/progress/events/commits/PR/pipeline/action fields: implementation trace.
- `source_*` fields on a work ticket: discovered external source ticket information, not Vibe Kanban parent-child links.

Source tickets and work tickets are different. A Jira, external Kanban, Linear, GitHub Issue, or similar human-managed ticket is the source requirement. A Vibe Kanban `task` is the agent work ticket. When the user provides one or more source tickets, fetch or inspect them with the relevant user-provided source skill or tool first, then create or update the Vibe Kanban work ticket with `source_type`, `source_id`, `source_url`, and `source_snapshot`. Do not create a separate Vibe Kanban ticket just to mirror each external source ticket.

## Required Workflow

1. If the request references external source tickets instead of Vibe Kanban ticket IDs, fetch/explore those source tickets first with the relevant source skill or tool supplied by the user.
2. Read any requested Vibe Kanban ticket with `get <ticket-id> --json`.
3. If the ticket is `type = US`, read its `use_case` children. If the ticket is `type = use_case`, `uat_feedback`, or `qc_feedback`, read its parent `US` if present. Use the available specs/source snapshots as product context.
4. For source-ticket, `US`, `use_case`, `uat_feedback`, or `qc_feedback` implementation requests, do not modify code yet. Look up relevant project memory, then scan the current codebase with CodeGraph first for the product area. Create or update the smallest independently reviewable `task` tickets, each with grounded `specification`, `execution_plan`, and source fields when applicable.
5. Upsert task tickets by matching existing child task titles/source identifiers when present; otherwise create new child `task` tickets. A task may be top-level when the source work is standalone. If an existing parent seems likely but is not explicit, ask the user before linking or reorganizing it. New or changed task plans must remain `open`, `user_reviewed = false`, and should be returned to the user for approval. Stop after task upsert.
6. If the requested ticket is `type = task`, stop immediately if `user_reviewed` is false or `execution_plan` is empty. Ask the user to review and approve the task ticket before implementation.
7. Read the linked parent ticket and grandparent `US` ticket from Vibe Kanban when present.
8. Look up relevant project memory with agentmemory before planning or coding. Use memory as context, not as an override for the approved ticket.
9. Identify the source ticket context, user story, use case or feedback group, task objective, acceptance criteria, constraints, open questions, assumptions, and approved execution plan from Vibe Kanban ticket content.
10. Stop and ask the user if any unresolved product, UX, data, integration, risk, or scope question affects implementation. Do not code while such a question is unresolved.
11. Use the `git-workflow` skill before code changes to inspect the worktree and checkout a working branch from `develop` using a Husky/conventional-compatible branch name:

   ```bash
   git status --short --branch
   git fetch
   git checkout develop
   git pull --ff-only
   git rev-parse HEAD
   git checkout -b <prefix>/vk-<task-ticket-id>-<short-title>
   ```

   Use `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, or `test/` based on the implementation intent. If the task was created from an external source ticket, include both identifiers: `<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>`. If multiple source tickets exist, use the primary source ticket id in the branch and keep the full set in the Vibe Kanban source snapshot and PR body.

   If `develop` is unavailable or not the correct base branch, stop and ask before choosing another base.

12. Record branch trace on the task ticket after checkout as defined by `git-workflow`:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs update <task-ticket-id> --branch "<branch>" --base-commit <develop-head> --quiet
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Checkout branch" --description "Created implementation branch from develop" --percent 5 --quiet
   ```

13. Explore the source scopes named by the approved task `execution_plan` using CodeGraph MCP first. Expand only as needed to understand architecture, dependencies, side effects, and test coverage. Record a quiet progress log when exploration materially confirms or refines the approved approach:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Explore source scope" --description "<what files, symbols, or flows were confirmed>" --percent 8 --quiet
   ```

14. Stop and ask for user review again if source exploration proves the approved execution plan is materially wrong or incomplete. Update the task `execution_plan` through Vibe Kanban before asking; that invalidates approval.
15. If the approved task materially creates or changes frontend UI, use the `ui-implementation` skill before coding. Apply its requirements as part of the approved plan: read `DESIGN.md`, use the relevant taste skill when available, prefer existing reusable components, consult ReactBits MCP when it can provide a suitable component, and use `reusable-component-builder` when extracting or creating shared React components. Do not let UI skill guidance expand product scope beyond the approved Vibe Kanban task.
16. Move the task ticket to `in_progress` through Vibe Kanban:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs start <task-ticket-id> --description "Approved task implementation started" --quiet
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 10 --note "Implementation started" --description "Started approved execution plan" --quiet
   ```

17. Implement only the approved task execution plan.
18. After each meaningful execution-plan step, write a quiet progress log:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "<plan step>" --description "<what was done>" --percent <0-100> --quiet
    ```

19. Update Vibe Kanban progress when the visible progress percent changes:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent <0-100> --note "<short progress note>" --description "<why progress changed>" --quiet
    ```

20. If blocked, move the task to `hold` and record the blocker in progress:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs hold <task-ticket-id> --description "Blocked: <reason>" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent <current> --note "Blocked: <reason>" --description "Implementation is blocked" --quiet
    ```

21. Run focused verification and record the result in Vibe Kanban progress:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Verify implementation" --description "<verification command and result>" --percent <0-100> --quiet
    ```

22. Use `git-workflow` to commit the implementation. Review the diff, stage only files that belong to the task, commit with a concise ticket-aware message, and add every relevant commit hash to the task ticket:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs add-commit <task-ticket-id> --commit-hash <hash> --branch <branch> --message "<message>" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Commit implementation" --description "Recorded commit <hash>" --percent <0-100> --quiet
    ```

23. After commit and verification, stop for local user review before PR when the user requested local review first, or when the task is UI-heavy, broad, risky, or better validated manually. Report the branch, commit hash, verification result, and local URL or command when relevant. Do not open a PR until the user confirms this local review gate.

24. When the local review gate is satisfied, use `git-workflow` to push the task branch and create a PR with GitHub CLI (`gh`). Record the PR URL, PR status, pipeline status, and relevant external action URLs in Vibe Kanban, then move the task to review:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs pr <task-ticket-id> --pr-url <url> --pr-status open --description "PR created" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs pipeline <task-ticket-id> --pipeline-status pending --pipeline-url <url> --description "Pipeline started" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs action-log <task-ticket-id> --action-type github-actions --status pending --url <url> --description "GitHub Actions started" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs review <task-ticket-id> --description "Implementation complete and PR is ready for review" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 90 --note "PR created: <url>" --description "PR opened for review" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Open PR" --description "Created PR: <url>" --percent 90 --quiet
    ```

25. Move the task to `closed` only when implementation is merged or the user explicitly accepts it as complete:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs close <task-ticket-id> --description "Merged or accepted by user" --quiet
    ```

## Stop Conditions

Pause and ask the user for confirmation whenever:

- The Vibe Kanban ticket is missing, is not a `task`, is not approved, or lacks an execution plan.
- The requested work is a source ticket, `US`, `use_case`, `uat_feedback`, or `qc_feedback` and generated/upserted tasks have not been reviewed yet.
- The linked parent context is missing and the implementation cannot be safely scoped from the task alone.
- The approved Vibe Kanban content has open questions that affect behavior, data shape, permissions, UX, integrations, or acceptance criteria.
- The approved plan and current code conflict in a way that changes product behavior or migration risk.
- Multiple implementation paths have materially different product behavior or operational risk.
- A needed dependency, API contract, external service, or permission model is unclear.
- The implementation would expand scope beyond the approved task.
- The `develop` branch is unavailable or not the correct base branch for the repository.
- The user requested local review before PR and has not confirmed that review is complete.
- GitHub CLI is unavailable, unauthenticated, or no GitHub remote exists when PR creation is requested.

Do not ask for confirmation for purely local, reversible engineering choices that do not change product behavior; record those as progress notes in Vibe Kanban.
