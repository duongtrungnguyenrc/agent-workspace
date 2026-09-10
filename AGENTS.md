# AGENTS.md

## Project Agent Workflows

This project keeps canonical project-local skills under `.agents/skills/` and setup links them into agent-specific folders such as `.codex/skills/` and `.claude/skills/`. Vibe Kanban stores local workflow data at `.vibe-kanban/vibe-kanban.sqlite`.

When a task involves product stories, use cases, implementation planning, implementation progress, or agent traceability, use Vibe Kanban as the control plane.

Before analysis, planning, or implementation, look for `PROJECTS.md` in the root workspace. If one exists, read it and follow its project-specific rules. These rules are mandatory unless they conflict with a higher-priority system or user instruction.

Implementation execution is scoped to `root-workspace/source/**`. Do not modify files outside `root-workspace/source/**` during project implementation unless the approved task explicitly requires a workspace configuration, workflow, documentation, or other supporting change.

## Skills

Use these project-local skills when their workflow applies:

- `.agents/skills/documenter/SKILL.md`: create and update product story and use-case documentation directly in Vibe Kanban.
- `.agents/skills/task-implementer/SKILL.md`: turn Vibe Kanban or external source tickets into approval-ready task tickets, then implement approved task tickets.
- `.agents/skills/vibe-kanban/SKILL.md`: create, inspect, approve, update, and trace Kanban tickets.
- `.agents/skills/auto-us/SKILL.md`: explicitly scan the project with CodeGraph to infer feature clusters and create US/use_case tickets when the user asks.
- `.agents/skills/react-ui-implementer/SKILL.md`: implement UI tasks using `DESIGN.md`, taste skills, existing reusable components, and ReactBits MCP.
- `.agents/skills/react-reusable-component-builder/SKILL.md`: create or extract reusable React components with typed APIs and clear ownership.
- `.agents/skills/design-collector/SKILL.md`: extract the project's existing design language into the repository `DESIGN.md` format.

Vibe Kanban command:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs <command>
```

Use `smart-search` to find related tickets before asking the user for IDs, especially when an implementation task may need a parent link:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs smart-search "<query>" --parent-for task --json
```

When analysis or implementation planning has unresolved questions, record them on the affected ticket and move it to `hold` before asking the user:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs questions <ticket-id> --questions "<markdown questions>" --description "Blocked pending user clarification" --quiet
```

If a skill/tool for human-facing notifications exists, such as Teams, Slack, email, or another configured channel, trigger it after writing `open_questions`; otherwise ask in the current chat. User feedback during pending task approval belongs in ticket `user_comments`.

## Analysis Checkpoint Rule

During product analysis, source-ticket intake, codebase inference, task planning, or execution-plan validation, stop and ask the user before creating or changing tickets when analysis reveals a decision that changes intent, scope, product behavior, UX, data contracts, integration ownership, risk level, or ticket hierarchy.

Ask a concise question with the options or tradeoffs discovered. Do not silently choose among materially different user intents. If the uncertainty is minor, local, reversible, and does not affect product meaning or implementation risk, proceed with a clearly stated assumption and record it in the Vibe Kanban ticket.

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

1. Use `documenter` skill.
2. Vibe Kanban tickets are the only product-documentation store.
3. Normalize raw user input into practical product docs with actor, goal, flows, business rules, acceptance criteria, assumptions, and open questions.
4. Identify all distinct use cases inside the story. Create multiple `use_case` child tickets under the same `US` when the story has multiple actor-system goals, scenarios, workflow variants, business outcomes, or acceptance areas.
5. If analysis reveals multiple plausible intents, actor goals, ticket hierarchies, or product/UX/data decisions, stop and ask the user before creating or changing tickets.
6. Do not create implementation `task` tickets or execution plans during story-building. The codebase may change before implementation, so task tickets are generated later from the current source state.
7. Create and store the linked Vibe Kanban ticket tree:

   ```bash
   node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type US --title "<story>" --specification "<story markdown>"
   node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type use_case --parent-id <us-ticket-id> --title "<use case>" --specification "<use case summary>"
   ```

8. Return the created Vibe Kanban ticket IDs and hierarchy to the user.
9. Do not implement code during this workflow.

Use `auto-us` only when the user explicitly asks to infer or generate user stories from the existing project. It must scan routes/navigation/sidebar/product surfaces with CodeGraph first, then create or update Vibe Kanban `US/use_case` tickets from feature clusters.

## Workflow 2: Implement

Use this workflow when the user asks to implement a Vibe Kanban `US`, `use_case`, `uat_feedback`, `qc_feedback`, approved `task`, or one or more external source tickets.

1. Use `task-implementer`.
2. Read the requested Vibe Kanban ticket:

   ```bash
   node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs get <ticket-id> --json
   ```

3. If the request references external source tickets instead of Vibe Kanban ticket IDs, use the relevant source-specific skill or tool supplied by the user to fetch/explore them first. Store source details directly on the Vibe Kanban work ticket; do not mirror source tickets as separate Vibe Kanban tickets.
4. If the ticket is `type = US`, `use_case`, `uat_feedback`, or `qc_feedback`, do not code yet. Read linked context, look up relevant project memory, scan the current codebase with CodeGraph first, then create or update implementation `task` tickets. Each generated task must include the current codebase-informed `specification`, `execution_plan`, and source fields when applicable; remain `open`; and have `user_reviewed = false`. Stop and return the generated task IDs for user review.
5. During planning analysis, use `smart-search` with source IDs, feature names, labels, or task titles to find related tickets and likely parents before asking the user for ticket IDs.
6. Stop and ask before creating or changing task tickets if materially different intents, implementation slices, parent links, UX behaviors, data contracts, integrations, or risk profiles are possible.
7. If a standalone top-level task is appropriate and no parent is explicit, run `smart-search` first; ask the user before linking it to an existing parent when several plausible parents remain.
8. If the requested ticket is `type = task`, stop before code changes if any of these are true:
   - The ticket is not `type = task`.
   - `user_reviewed` is false.
   - The task has no execution plan.
   - The implementation scope is unclear or conflicts with product docs.

9. Read linked parent tickets from Vibe Kanban when present. Do not require local `documents/**` files for product context.
10. Look up relevant project memory with agentmemory skill if exist before planning or coding. Treat memory as context, not as an override for the approved task.
11. Read `.agents/skills/task-implementer/references/git-workflow.md`, then use it to inspect the worktree and checkout a branch from `develop` using a Husky/conventional-compatible branch name:

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

12. Record branch trace on the task ticket through Vibe Kanban:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs update <task-ticket-id> --branch "<branch>" --base-commit <develop-head> --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Checkout branch" --description "Created implementation branch from develop" --percent 5 --quiet
```

13. Confirm that the approved execution scope is under `source/**`, then explore the named source scopes using CodeGraph MCP first. Expand only as needed. Record source exploration with `progress-log`.
14. Stop and ask for user review again if source exploration proves the approved execution plan is materially wrong or incomplete. Update the task `execution_plan` through Vibe Kanban before asking; that invalidates approval.
15. Move the task into implementation:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs start <task-ticket-id> --description "Approved task implementation started" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 10 --note "Implementation started" --description "Started approved execution plan" --quiet
```

16. Implement only the approved task execution plan.
17. After each meaningful execution-plan step, record a quiet progress log:

    ```bash
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "<plan step>" --description "<what was done>" --percent <0-100> --quiet
    ```

18. Update Vibe Kanban progress as work advances, including a short description of why progress changed.
19. Run focused verification and record results in Vibe Kanban progress.
20. After focused verification, prepare the diff and stop for mandatory local user review before committing. Report the changed files, verification result, and local URL or command when relevant. Do not commit until the user confirms the local review is complete.

21. After the user confirms local review, read `.agents/skills/task-implementer/references/git-workflow.md` and use it to review the diff, stage only files that belong to the task, commit the work, and add every relevant commit to the task ticket:

    ```bash
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs add-commit <task-ticket-id> --commit-hash <hash> --branch <branch> --message "<message>" --quiet
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Commit implementation" --description "Recorded commit <hash>" --percent <0-100> --quiet
    ```

22. After commit, continue to PR creation only after the local review confirmation has been recorded.

23. Use the reference workflow to push the task branch and create a PR with GitHub CLI (`gh`). Record the PR URL, PR status, pipeline, and external action trace in Vibe Kanban progress, and move the task to review:

    ```bash
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs pr <task-ticket-id> --pr-url <url> --pr-status open --description "PR created" --quiet
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs pipeline <task-ticket-id> --pipeline-status pending --pipeline-url <url> --description "Pipeline started" --quiet
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs action-log <task-ticket-id> --action-type github-actions --status pending --url <url> --description "GitHub Actions started" --quiet
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs review <task-ticket-id> --description "Implementation complete and PR is ready for review" --quiet
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 90 --note "PR created: <url>" --description "PR opened for review" --quiet
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Open PR" --description "Created PR: <url>" --percent 90 --quiet
    ```

24. Move the task to `closed` only when implementation is merged or the user explicitly accepts it as complete:

    ```bash
    node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs close <task-ticket-id> --description "Merged or accepted by user" --quiet
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

For implementation changes, read `.agents/skills/task-implementer/references/git-workflow.md` for branch setup, commit discipline, mandatory local review before commit, GitHub CLI PR creation, and PR review.

- Do not implement on `develop`, `main`, or another protected/base branch.
- Branch names must use Husky/conventional-compatible prefixes. Use `<prefix>/vk-<task-ticket-id>-<short-title>` for pure Vibe Kanban tasks and `<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>` for source-ticket-driven tasks.
- Inspect the worktree before checkout and before commit.
- Keep unrelated user changes intact.
- Commit only task-related files.
- Use `gh pr create` for PRs when GitHub CLI is available and authenticated.
- Always stop after focused verification and before commit for local user review. Report the branch, changed files, verification result, and local URL or command when relevant; wait for confirmation before committing.

## UI Implementation Rule

For frontend UI implementation tasks:

- Use `react-ui-implementer`.
- Read `DESIGN.md` before making visual decisions.
- Use the relevant taste skill when available, usually `design-taste-frontend` for new UI or `redesign-existing-projects` for improving existing UI.
- Use ReactBits MCP to discover and fetch suitable components when they match the design direction and reduce bespoke UI work.
- Prefer existing local components before adding new ones.
- Use `react-reusable-component-builder` when creating, extracting, or refactoring reusable React components.
- Keep route files focused on page composition and move reusable UI into `src/shared/ui` or the owning feature module.
