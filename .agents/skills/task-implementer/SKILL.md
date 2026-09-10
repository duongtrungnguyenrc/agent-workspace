---
name: task-implementer
description: Turn Vibe Kanban or external source tickets into approval-ready task tickets, then implement approved Vibe Kanban tasks.
---

# Task Implementer

Use this skill when the user asks to implement a Vibe Kanban `group`, `feature`, `task`, or one or more external source tickets. Vibe Kanban is the source of truth for agent work tickets, generated implementation tasks, approved execution plans, implementation progress, Git trace, PR state, pipeline state, and action history.

Read [references/git-workflow.md](references/git-workflow.md) for branch checkout, commit discipline, mandatory local review before commit, GitHub CLI PR creation, and PR review. This skill decides what to implement; the reference defines how Git and GitHub state should be managed.

For approved React UI work, read [references/react-ui-implementation.md](references/react-ui-implementation.md). Read [references/react-reusable-components.md](references/react-reusable-components.md) only when the task creates, extracts, or materially refactors reusable components.

Before any analysis or implementation, look for `PROJECTS.md` in the current repository and any applicable project directory. If present, read and follow it as mandatory project-specific instruction.

All implementation execution is scoped to `source/**`. Do not modify files outside `source/**` unless the approved task explicitly requires a workspace-level supporting change.

Do not require, read, create, or maintain `documents/**`, `document.md`, product-doc `progress.md`, `.agents/processes/**/plan.md`, or `.agents/processes/**/progress.md` files for implementation planning, product context, progress, or trace.

## Plugins

Every installed skill is a plugin. At the decision points below, look at the installed skills (`.agents/skills/*/SKILL.md`, or the skill list your runtime exposes), judge relevance from their descriptions and any rules in `PROJECTS.md`, and propose the ones that fit. Ask the user in one concise question before triggering a plugin that posts to a human channel or external system; read-only fetches with an unambiguous match may run directly, saying what ran. Record the outcome with `pnpm -s vk action-log <task-ticket-id> --action-type plugin:<name> --status <triggered|skipped|failed> --url <url> --description "<what happened>" --quiet`. When nothing fits or the user declines, use the default and continue; never let a plugin block the ticket.

| Step | Decision point | Default when no plugin fits |
| --- | --- | --- |
| 1 | External source tickets to read | Ask the user for the content; store it as `source_snapshot` |
| 4, 10 | Project memory (agentmemory when available) | Skip |
| 4, 15 | Code exploration (CodeGraph when indexed) | Targeted Read/Grep; record the limitation in the task `specification` |
| 12 | Blocking questions for humans | Ask in the current chat; the ticket stays on `hold` |
| 17 | Design context for UI work | Nearest `DESIGN.md`, then the React references |
| 24 | Review before commit | PR Review stance in [references/git-workflow.md](references/git-workflow.md) |
| 27 | Delivery and notification | GitHub CLI steps in the same reference; mention the PR in chat |

## Source Of Truth

Read the task ticket with JSON output:

```bash
pnpm -s vk get <task-ticket-id> --json
```

Use the ticket tree as product context:

```text
group ticket
  feature ticket
    task ticket[]  # generated/upserted when implementation is requested

group ticket  # feedback-driven or maintenance grouping without features
  task ticket[]

task ticket  # may be top-level for standalone or source-ticket-driven work
```

- `group` ticket `specification`: high-level user story, product goals, or the theme of a feedback/maintenance group.
- `feature` ticket `specification`: one use case: actor-system behavior, flows, rules, and acceptance criteria.
- `task` ticket `specification`: implementation task context created after current codebase exploration.
- `task` ticket `execution_plan`: implementation plan that must be approved before coding.
- `task` ticket status/progress/events/commits/PR/pipeline/action fields: implementation trace.
- `source_*` fields on a work ticket: discovered external source ticket information, not Vibe Kanban parent-child links.

Source tickets and work tickets are different. A Jira, external Kanban, Linear, GitHub Issue, or similar human-managed ticket is the source requirement. A Vibe Kanban `task` is the agent work ticket. When the user provides one or more source tickets, fetch or inspect them with the relevant user-provided source skill or tool first, then create or update the Vibe Kanban work ticket with `source_type`, `source_id`, `source_url`, `source_snapshot`, and relevant source evidence. Capture screenshots, fetched images, attachments, design references, logs, and supporting URLs when they materially affect implementation or acceptance. Store evidence through `--source-evidence <json|@file>` as an array of `{ "type": "image" | "link", "url": "https://...", "label": "...", "description": "..." }`. Preserve provenance, avoid credentials, and do not reduce useful visual evidence to a text-only summary. Do not create a separate Vibe Kanban ticket just to mirror each external source ticket.

## Required Workflow

1. If the request references external source tickets instead of Vibe Kanban ticket IDs, read them first through the fitting plugin (for example `github-source` for GitHub issues) or the tool the user supplies; otherwise ask the user for the content.
2. Read any requested Vibe Kanban ticket with `get <ticket-id> --json`.
3. If the ticket is `type = group`, read its `feature` children. If the ticket is `type = feature`, read its parent `group` if present. Use the available specs/source snapshots as product context.
4. For source-ticket, `group`, `feature` implementation requests, do not modify code yet. Recall project memory if a memory plugin is available, then explore the product area with CodeGraph first. If the repository has no `.codegraph/` index, follow the project CodeGraph fallback rule and use targeted source inspection, but record that limitation in the task `specification`. Create or update the smallest independently reviewable `task` tickets, each with grounded `specification`, checklist-form `execution_plan`, source fields, and captured evidence when applicable.
5. During this analysis, use Vibe Kanban `smart-search` to find related tickets and likely parents before deciding that parent context is missing. For example, search source ids, feature names, user-facing labels, and task titles with `pnpm -s vk smart-search "<query>" --parent-for task --json`. Read `kind_detection` and `parent_suggestion` from the output: they give the proposed task kind (`feature`, `bugfix`, `refactor`, `chore`, `docs`, `test`) and the best parent with a `confidence` and candidate ids.
6. Stop and ask before creating or changing task tickets if multiple plausible intents, implementation slices, ticket parents, UX behaviors, data contracts, integrations, or risk profiles would lead to different execution plans. Ask a concise question with the options discovered. For minor local assumptions that do not change scope or behavior, proceed and record the assumption in the task `specification`.
7. Upsert task tickets by matching existing child task titles/source identifiers when present; otherwise create new child `task` tickets with `--kind <kind>` and `--parent-id <id>`. For a free-form task request with no explicit parent, follow the Vibe Kanban "Free-Form Task Intake" rule: propose the detected kind and the suggested `feature` or `group` parent to the user in one concise confirmation (a `high` confidence suggestion is the default answer; `medium`/`low` lists the candidates plus a top-level option), and create a top-level task only after the user accepts it. New or changed task plans must remain `open`, `user_reviewed = false`, and should be returned to the user for approval. Stop after task upsert.
8. If the requested ticket is `type = task`, stop immediately if `user_reviewed` is false or `execution_plan` is empty. Ask the user to review and approve the task ticket before implementation.
9. Read the linked parent ticket and grandparent `group` ticket from Vibe Kanban when present.
10. Recall relevant project memory (agentmemory when available) before planning or coding. Use memory as context, not as an override for the approved ticket.
11. Identify the source ticket context, group, feature, task objective, acceptance criteria, constraints, open questions, assumptions, and approved execution plan from Vibe Kanban ticket content.
12. If any unresolved product, UX, data, integration, risk, or scope question affects implementation, write the questions to the task with `pnpm -s vk questions <task-ticket-id> --questions "<markdown questions>" --description "Blocked pending user clarification" --quiet`, leaving the ticket on `hold`. Then consider the installed skills that can carry questions to humans (for example `github-source` posting to the source issue, or a Teams, Slack, or Jira skill the project has): ask the user in one question whether to send the questions through the fitting plugin, naming it and the channel, or to answer here; record the outcome with `action-log --action-type plugin:<name>`; when nothing fits or the user declines, ask in the current chat. Do not code while such a question is unresolved.
13. Read [references/git-workflow.md](references/git-workflow.md), then use it before code changes to inspect the worktree and checkout a working branch from `develop` using a Husky/conventional-compatible branch name:

```bash
git status --short --branch
git fetch
git checkout develop
git pull --ff-only
git rev-parse HEAD
git checkout -b <prefix>/vk-<task-ticket-id>-<short-title>
```

Derive the prefix from the task `kind`: `feature -> feat/`, `bugfix -> fix/`, `refactor -> refactor/`, `chore -> chore/`, `docs -> docs/`, `test -> test/`. If the task has no kind, set one with `update <task-ticket-id> --kind <kind> --quiet` before checkout. If the task was created from an external source ticket, include both identifiers: `<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>`. If multiple source tickets exist, use the primary source ticket id in the branch and keep the full set in the Vibe Kanban source snapshot and PR body.

If `develop` is unavailable or not the correct base branch, stop and ask before choosing another base.

14. Record branch trace on the task ticket using [references/git-workflow.md](references/git-workflow.md):

```bash
pnpm -s vk update <task-ticket-id> --branch "<branch>" --base-commit <develop-head> --quiet
pnpm -s vk progress-log <task-ticket-id> --step "Checkout branch" --description "Created implementation branch from develop" --percent 5 --quiet
```

15. Confirm that the approved task `execution_plan` names only scopes under `source/**`. Explore those scopes with CodeGraph MCP first, or another code-exploration plugin the project prefers. Expand only as needed to understand architecture, dependencies, side effects, and test coverage. Record a quiet progress log when exploration materially confirms or refines the approved approach:

```bash
pnpm -s vk progress-log <task-ticket-id> --step "Explore source scope" --description "<what files, symbols, or flows were confirmed>" --percent 8 --quiet
```

16. Stop and ask for user review again if source exploration proves the approved execution plan is materially wrong or incomplete. Update the task `execution_plan` through Vibe Kanban before asking; that invalidates approval.
17. If the approved task materially creates or changes UI, gather design context (nearest `DESIGN.md`, or a design plugin the project has), then read [references/react-ui-implementation.md](references/react-ui-implementation.md) before coding React UI. If it creates, extracts, or materially refactors reusable components, also read [references/react-reusable-components.md](references/react-reusable-components.md). Apply those references within the approved Vibe Kanban scope.
18. Move the task ticket to `in_progress` through Vibe Kanban:

```bash
pnpm -s vk start <task-ticket-id> --description "Approved task implementation started" --quiet
pnpm -s vk progress <task-ticket-id> --percent 10 --note "Implementation started" --description "Started approved execution plan" --quiet
```

19. Implement only the approved task execution plan.
20. Treat every top-level Markdown checklist item in `execution_plan` as a monitorable step. Set a step to `in_progress` before executing it, then `completed` after verification of that step; use `blocked` when progress cannot continue. Address a step by its checklist position or exact label:

    ```bash
    pnpm -s vk progress-log <task-ticket-id> --step <number> --step-status in_progress --description "<what is starting>" --quiet
    pnpm -s vk progress-log <task-ticket-id> --step <number> --step-status completed --description "<what was completed and verified>" --quiet
    ```

    Omit `--percent` on step updates: the tool derives `progress_percent` from completed steps. Use ordinary `progress-log` without `--step-status` only for meaningful trace entries that do not correspond to a plan step. Socket updates make step status visible in ticket detail and the floating progress monitor, so update promptly rather than batching changes at the end.

21. Use `progress --percent` only for trace that the checklist does not express, and never lower a percent the checklist already reached:

    ```bash
    pnpm -s vk progress <task-ticket-id> --percent <0-100> --note "<short progress note>" --description "<why progress changed>" --quiet
    ```

22. If blocked, move the task to `hold` and record the blocker in progress:

    ```bash
    pnpm -s vk hold <task-ticket-id> --description "Blocked: <reason>" --quiet
    pnpm -s vk progress <task-ticket-id> --percent <current> --note "Blocked: <reason>" --description "Implementation is blocked" --quiet
    ```

23. Run focused verification and complete the verification checklist step with the command and result in its description:

    ```bash
    pnpm -s vk progress-log <task-ticket-id> --step "<verification step label>" --step-status completed --description "<verification command and result>" --quiet
    ```

24. Review the diff yourself, or with a review plugin the project prefers, then stop for mandatory local user review. Report the changed files, verification result, and local URL or command when relevant. Do not commit until the user confirms the local review is complete.

25. After the user confirms local review, read [references/git-workflow.md](references/git-workflow.md) and use it to review the diff, stage only files that belong to the task, commit with a concise ticket-aware message, and add every relevant commit hash to the task ticket:

    ```bash
    pnpm -s vk add-commit <task-ticket-id> --commit-hash <hash> --url <commit-url> --branch <branch> --message "<message>" --quiet
    pnpm -s vk progress-log <task-ticket-id> --step "Commit implementation" --description "Recorded commit <hash>" --quiet
    ```

26. After commit, continue to PR creation only after the local review confirmation has been recorded.

27. When the local review gate is satisfied, use [references/git-workflow.md](references/git-workflow.md) to push the task branch and create a PR with GitHub CLI (`gh`), or the delivery plugin the project prefers. Record the PR URL, PR status, pipeline status, and relevant external action URLs in Vibe Kanban, move the task to review, then offer to announce it through a notification plugin if the project has one:

    ```bash
    pnpm -s vk pr <task-ticket-id> --pr-url <url> --pr-status open --description "PR created" --quiet
    pnpm -s vk pipeline <task-ticket-id> --pipeline-status pending --pipeline-url <url> --description "Pipeline started" --quiet
    pnpm -s vk action-log <task-ticket-id> --action-type github-actions --status pending --url <url> --description "GitHub Actions started" --quiet
    pnpm -s vk review <task-ticket-id> --description "Implementation complete and PR is ready for review" --quiet
    pnpm -s vk progress-log <task-ticket-id> --step "Open PR" --description "Created PR: <url>" --quiet
    ```

28. Move the task to `closed` only when implementation is merged or the user explicitly accepts it as complete:

    ```bash
    pnpm -s vk close <task-ticket-id> --description "Merged or accepted by user" --quiet
    ```

## Stop Conditions

Pause and ask the user for confirmation whenever:

- The Vibe Kanban ticket is missing, is not a `task`, is not approved, or lacks an execution plan.
- The requested work is a source ticket, `group`, `feature` and generated/upserted tasks have not been reviewed yet.
- Planning analysis reveals materially different possible intents, task slices, parent links, product behaviors, data contracts, integrations, or risk profiles.
- The linked parent context is still missing after `smart-search` and the implementation cannot be safely scoped from the task alone.
- The approved Vibe Kanban content has open questions that affect behavior, data shape, permissions, UX, integrations, or acceptance criteria; record them with `questions` and keep the ticket on `hold` until answered.
- The approved plan and current code conflict in a way that changes product behavior or migration risk.
- Multiple implementation paths have materially different product behavior or operational risk.
- A needed dependency, API contract, external service, or permission model is unclear.
- The implementation would expand scope beyond the approved task.
- The `develop` branch is unavailable or not the correct base branch for the repository.
- The mandatory local review has not been completed and confirmed by the user before commit.
- GitHub CLI is unavailable, unauthenticated, or no GitHub remote exists when PR creation is requested.

Do not ask for confirmation for purely local, reversible engineering choices that do not change product behavior; record those as progress notes in Vibe Kanban.
