# Git Workflow

Use this spec when a task involves preparing a work branch, committing implementation changes, opening a pull request, updating Vibe Kanban Git trace, or reviewing code before merge.

This spec controls Git and GitHub workflow only. It does not replace the product-documentation or implementation-approval workflow. If the work is tied to a Vibe Kanban `task` ticket, use Vibe Kanban for ticket status, progress, branch, commit, source-ticket, PR, pipeline, and action trace.

## Core Rules

- Do not modify implementation code on `develop`, `main`, or another protected/base branch.
- Do not overwrite, reset, or revert user changes unless the user explicitly asks for that destructive operation.
- Before branch changes, inspect the current branch and worktree state with `git status --short --branch`.
- If unrelated local changes exist, keep them intact. Only ask the user when those changes block checkout, verification, or committing the task.
- Prefer `develop` as the base branch. If `develop` is missing or the repository clearly uses another integration branch, stop and ask before choosing a different base.
- Use Husky/conventional-compatible branch prefixes: `feat/`, `fix/`, `chore/`, `refactor/`, `docs/`, or `test/`. Choose the prefix from the work intent.
- For Vibe Kanban tasks without an external source ticket, use `<prefix>/vk-<task-ticket-id>-<short-title>`.
- For Vibe Kanban tasks created from an external source ticket, use `<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>`, for example `fix/JIRA-123-vk-42-login-timeout`. If multiple source tickets exist, use the primary source ticket id and include the rest in the PR body and Vibe Kanban source snapshot.
- Commit only files that belong to the task. Avoid broad `git add .` unless the task intentionally changed all visible files.
- Use GitHub CLI (`gh`) for PR creation when authenticated and a GitHub remote is configured.

## Branch Setup

For a Vibe Kanban task, checkout from a clean, updated base and record the trace:

```bash
git status --short --branch
git fetch
git checkout develop
git pull --ff-only
git rev-parse HEAD
git checkout -b <prefix>/vk-<task-ticket-id>-<short-title>
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs update <task-ticket-id> --branch "<prefix>/vk-<task-ticket-id>-<short-title>" --base-commit <develop-head> --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Checkout branch" --description "Created implementation branch from develop" --percent 5 --quiet
```

When the task has a source ticket, use the source-aware form instead:

```bash
git checkout -b <prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs update <task-ticket-id> --branch "<prefix>/<source-ticket-id>-vk-<task-ticket-id>-<short-title>" --base-commit <develop-head> --quiet
```

If the branch already exists, inspect it instead of recreating it. Confirm it is based on the expected base or ask the user if rebasing, recreating, or continuing from that branch would be safer.

## Local Review Gate

After coding, verification, and commit, give the user a chance to review locally before opening a PR when either condition applies:

- The user asked to review locally before PR.
- The task is UI-heavy, risky, broad, or would benefit from a manual local pass.

At this gate, report the branch, commit hash, verification result, and local URL or command when relevant. Do not create the PR until the user confirms.

If the user previously asked for fully automatic PR creation after task completion, continue to PR creation after the commit and verification unless a stop condition applies.

## Commit

After implementation and verification:

1. Review the diff with `git status --short` and a focused diff command.
2. Stage only task-related files.
3. Commit with a concise message that references the ticket when available.
4. Record the commit hash in Vibe Kanban when the work is tied to a task ticket.

```bash
git status --short
git diff -- <relevant-paths>
git add <relevant-paths>
git commit -m "<type>: <summary>"
git rev-parse HEAD
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs add-commit <task-ticket-id> --commit-hash <hash> --branch <branch> --message "<message>" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Commit implementation" --description "Recorded commit <hash>" --percent <percent> --quiet
```

If there are no changes after verification, do not create an empty commit unless the user explicitly asked for one.

## Pull Request

Before creating a PR, verify GitHub CLI readiness:

```bash
gh auth status
git remote -v
git status --short --branch
```

Push the branch and create the PR:

```bash
git push -u origin <branch>
gh pr create --base develop --head <branch> --title "<title>" --body "<body>"
```

PR body should include:

- Vibe Kanban ticket code and title, when available.
- Source ticket system/id/URL when the work came from Jira, another Kanban board, Linear, GitHub Issues, or a similar external system.
- Summary of changes.
- Verification commands and results.
- Known risks, migrations, rollout notes, or follow-up work.

After the PR is created, record the URL, PR status, and any pipeline/action URL you can identify, then move the task to review:

```bash
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs pr <task-ticket-id> --pr-url <url> --pr-status open --description "PR created" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs pipeline <task-ticket-id> --pipeline-status pending --pipeline-url <url> --description "Pipeline started" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs action-log <task-ticket-id> --action-type github-actions --status pending --url <url> --description "GitHub Actions started" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs review <task-ticket-id> --description "Implementation complete and PR is ready for review" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress <task-ticket-id> --percent 90 --note "PR created: <url>" --description "PR opened for review" --quiet
node .agents/skills/vibe-kanban/scripts/vibe-kanban.mjs progress-log <task-ticket-id> --step "Open PR" --description "Created PR: <url>" --percent 90 --quiet
```

If `gh` is not installed, not authenticated, or no GitHub remote exists, stop after commit and provide the exact branch, commit, and command the user can run next.

## PR Review

When asked to review a PR or review the agent's changes before PR:

- Use a code-review stance: findings first, ordered by severity, with file/line references.
- Inspect only the relevant diff unless the review requires broader context.
- Check correctness, behavior regressions, security/privacy risk, data migrations, missing tests, and user-facing UX issues.
- If no issues are found, say that clearly and mention remaining verification gaps.

Do not mark a Vibe Kanban task `closed` just because a PR exists. Close the task only after merge or explicit user acceptance.
