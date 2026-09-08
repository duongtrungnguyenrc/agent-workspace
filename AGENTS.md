# AGENTS.md

## Project Agent Workflows

This project uses project-local Codex skills under `.codex/skills/` and a local Vibe Kanban database at `.vibe-kanban/vibe-kanban.sqlite`.

When a task involves product stories, use cases, implementation planning, implementation progress, or agent traceability, use Vibe Kanban as the control plane.

## Skills

Use these project-local skills when their workflow applies:

- `.codex/skills/product-doc-stories/SKILL.md`: create and update product story and use-case documentation directly in Vibe Kanban.
- `.codex/skills/product-doc-implementer/SKILL.md`: turn Vibe Kanban or external source tickets into approval-ready task tickets, then implement approved task tickets.
- `.codex/skills/vibe-kanban/SKILL.md`: create, inspect, approve, update, and trace Kanban tickets.
- `.codex/skills/auto-us/SKILL.md`: explicitly scan the project with CodeGraph to infer feature clusters and create US/use_case tickets when the user asks.
- `.codex/skills/git-workflow/SKILL.md`: keep changes on a proper work branch, commit scoped changes, stop for local review when needed, create GitHub CLI PRs, and review PRs.
- `.codex/skills/ui-implementation/SKILL.md`: implement UI tasks using `DESIGN.md`, taste skills, existing reusable components, and ReactBits MCP.
- `.codex/skills/reusable-component-builder/SKILL.md`: create or extract reusable React components with typed APIs and clear ownership.

Vibe Kanban command:

```bash
node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs <command>
```

## Vibe Kanban Ticket Model

Use this hierarchy for product work:

```text
US
  use_case[]
    task[]  # created/upserted only when implementation is requested

uat_feedback | qc_feedback
  task[]

task  # may be top-level for standalone or source-ticket-driven work
```

- `US` tickets represent user stories and are top-level.
- `use_case` tickets must be linked to a parent `US` ticket.
- A single `US` ticket may have many `use_case` children.
- `task` tickets may be top-level for standalone or source-ticket-driven work, or linked under `US`, `use_case`, `uat_feedback`, or `qc_feedback` when that helps review.
- A single `use_case` or feedback group ticket may have many `task` children.
- `task` tickets are the implementation, approval, progress, branch, commit, and PR trace unit.
- `uat_feedback` and `qc_feedback` tickets group human feedback that is not naturally a user story.
- Store implementation execution plans on `task` tickets, not only on parent `US` or `use_case` tickets.
- During story-building, keep Vibe Kanban at `US -> use_case[]` only. Do not pre-create implementation `task` tickets from product ideas.
- When the user asks to implement a `US`, `use_case`, feedback group, or external source ticket, scan the current codebase first, then create or update the smallest useful implementation `task` tickets with fresh execution plans.

## Workflow 1: Build Story

Use this workflow when the user asks to create or organize product stories, use cases, scenarios, requirements, or product docs.

1. Use `product-doc-stories`.
2. Do not create or manage local `documents/**`, `document.md`, or product-doc `progress.md` files for story work. Vibe Kanban tickets are the only product-documentation store.
3. Normalize raw user input into practical product docs with actor, goal, flows, business rules, acceptance criteria, assumptions, and open questions.
4. Identify all distinct use cases inside the story. Create multiple `use_case` child tickets under the same `US` when the story has multiple actor-system goals, scenarios, workflow variants, business outcomes, or acceptance areas.
5. Do not create implementation `task` tickets or execution plans during story-building. The codebase may change before implementation, so task tickets are generated later from the current source state.
6. Create and store the linked Vibe Kanban ticket tree:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type US --title "<story>" --specification "<story markdown>"
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type use_case --parent-id <us-ticket-id> --title "<use case>" --specification "<use case summary>"
   ```

7. Return the created Vibe Kanban ticket IDs and hierarchy to the user.
8. Do not implement code during this workflow.

Use `auto-us` only when the user explicitly asks to infer or generate user stories from the existing project. It must scan routes/navigation/sidebar/product surfaces with CodeGraph first, then create or update Vibe Kanban `US/use_case` tickets from feature clusters.

## Workflow 2: Implement

Use this workflow when the user asks to implement a Vibe Kanban `US`, `use_case`, `uat_feedback`, `qc_feedback`, approved `task`, or one or more external source tickets.

1. Use `product-doc-implementer`.
2. Read the requested Vibe Kanban ticket:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs get <ticket-id> --json
   ```

3. If the request references external source tickets instead of Vibe Kanban ticket IDs, use the relevant source-specific skill or tool supplied by the user to fetch/explore them first. Store source details directly on the Vibe Kanban work ticket; do not mirror source tickets as separate Vibe Kanban tickets.
4. If the ticket is `type = US`, `use_case`, `uat_feedback`, or `qc_feedback`, do not code yet. Read linked context, look up relevant project memory, scan the current codebase with CodeGraph first, then create or update implementation `task` tickets. Each generated task must include the current codebase-informed `specification`, `execution_plan`, and source fields when applicable; remain `open`; and have `user_reviewed = false`. Stop and return the generated task IDs for user review.
5. If a standalone top-level task is appropriate and no parent is explicit, ask the user before linking it to an existing parent.
6. If the requested ticket is `type = task`, stop before code changes if any of these are true:

   - The ticket is not `type = task`.
   - `user_reviewed` is false.
   - The task has no execution plan.
   - The implementation scope is unclear or conflicts with product docs.

7. Read linked parent tickets from Vibe Kanban when present. Do not require local `documents/**` files for product context.
8. Look up relevant project memory with agentmemory skill if exist before planning or coding. Treat memory as context, not as an override for the approved task.
9. Use `git-workflow` to inspect the worktree and checkout a branch from `develop` using a Husky/conventional-compatible branch name:

   ```bash
   git status --short --branch
   git fetch
   git checkout develop
   git pull --ff-only
   git rev-parse HEAD
   git checkout -b <prefix>/vk-<task-ticket-id>-<short-title>
   ```

   Use `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, or `test/` based on the work intent. If the task has a source ticket, include both identifiers: `<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>`. If multiple source tickets exist, use the primary source ticket id in the branch and keep the rest in the Vibe Kanban source snapshot and PR body.

   If `develop` is unavailable or not the correct base branch, stop and ask the user.

10. Record branch trace on the task ticket through Vibe Kanban:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs update <task-ticket-id> --branch "<branch>" --base-commit <develop-head> --quiet
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Checkout branch" --description "Created implementation branch from develop" --percent 5 --quiet
   ```

11. Explore the codebase using CodeGraph MCP first for the scopes named in the approved task execution plan. Expand only as needed. Record source exploration with `progress-log`.
12. Stop and ask for user review again if source exploration proves the approved execution plan is materially wrong or incomplete. Update the task `execution_plan` through Vibe Kanban before asking; that invalidates approval.
13. Move the task into implementation:

   ```bash
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs start <task-ticket-id> --description "Approved task implementation started" --quiet
   node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 10 --note "Implementation started" --description "Started approved execution plan" --quiet
   ```

14. Implement only the approved task execution plan.
15. After each meaningful execution-plan step, record a quiet progress log:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "<plan step>" --description "<what was done>" --percent <0-100> --quiet
    ```

16. Update Vibe Kanban progress as work advances, including a short description of why progress changed.
17. Run focused verification and record results in Vibe Kanban progress.
18. Use `git-workflow` to review the diff, stage only files that belong to the task, commit the work, and add every relevant commit to the task ticket:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs add-commit <task-ticket-id> --commit-hash <hash> --branch <branch> --message "<message>" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Commit implementation" --description "Recorded commit <hash>" --percent <0-100> --quiet
    ```

19. After commit and verification, stop for local user review before PR when the user requested it, or when the task is UI-heavy, broad, risky, or better validated manually. Report the branch, commit hash, verification result, and local URL or command when relevant. Do not create the PR until the user confirms this local review gate.

20. Use `git-workflow` to push the task branch and create a PR with GitHub CLI (`gh`). Record the PR URL, PR status, pipeline, and external action trace in Vibe Kanban progress, and move the task to review:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs pr <task-ticket-id> --pr-url <url> --pr-status open --description "PR created" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs pipeline <task-ticket-id> --pipeline-status pending --pipeline-url <url> --description "Pipeline started" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs action-log <task-ticket-id> --action-type github-actions --status pending --url <url> --description "GitHub Actions started" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs review <task-ticket-id> --description "Implementation complete and PR is ready for review" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 90 --note "PR created: <url>" --description "PR opened for review" --quiet
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Open PR" --description "Created PR: <url>" --percent 90 --quiet
    ```

21. Move the task to `closed` only when implementation is merged or the user explicitly accepts it as complete:

    ```bash
    node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs close <task-ticket-id> --description "Merged or accepted by user" --quiet
    ```

## Approval Rule

Agents may prepare freely: inspect tickets, use agentmemory, explore code with CodeGraph, write product docs into Vibe Kanban tickets, and create or update execution plans on task tickets when implementation has been requested.

Agents must not modify implementation code for a task until the current Vibe Kanban `task` execution plan is explicitly approved by the user.

If a task execution plan changes after approval, approval becomes invalid and the user must review again.

## CodeGraph Rule

For structural code questions, use CodeGraph MCP first:

- where a symbol is defined
- what calls a symbol
- what a symbol calls
- what would break if a symbol changes
- focused source context for an implementation scope

Use native text search only for literal strings, comments, log messages, or after a specific file is already identified.

## Progress Rule

Keep status, progress percent, branch, commits, PR trace, pipeline trace, action items, blockers, decisions, and verification notes in the Vibe Kanban task ticket.

Do not create or maintain local Markdown files such as `.agents/processes/**/progress.md`, `.agents/processes/**/plan.md`, `documents/**`, or `document.md` for product documentation, implementation plans, progress, or trace.

When changing status from CLI, always pass `--description` to explain why the status changed. Use `progress-log` after each meaningful approved execution-plan step; it is quiet by default and exists for agent step trace.

Vibe Kanban is the approval, documentation, progress, and trace source of truth.

## Git Workflow Rule

For implementation changes, use `git-workflow` for branch setup, commit discipline, local review before PR, GitHub CLI PR creation, and PR review.

- Do not implement on `develop`, `main`, or another protected/base branch.
- Branch names must use Husky/conventional-compatible prefixes. Use `<prefix>/vk-<task-ticket-id>-<short-title>` for pure Vibe Kanban tasks and `<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>` for source-ticket-driven tasks.
- Inspect the worktree before checkout and before commit.
- Keep unrelated user changes intact.
- Commit only task-related files.
- Use `gh pr create` for PRs when GitHub CLI is available and authenticated.
- If the user wants local review before PR, stop after commit and verification, report branch/commit/testing details, and wait for confirmation before creating the PR.

## UI Implementation Rule

For frontend UI implementation tasks:

- Use `ui-implementation`.
- Read `DESIGN.md` before making visual decisions.
- Use the relevant taste skill when available, usually `design-taste-frontend` for new UI or `redesign-existing-projects` for improving existing UI.
- Use ReactBits MCP to discover and fetch suitable components when they match the design direction and reduce bespoke UI work.
- Prefer existing local components before adding new ones.
- Use `reusable-component-builder` when creating, extracting, or refactoring reusable React components.
- Keep route files focused on page composition and move reusable UI into `src/shared/ui` or the owning feature module.
