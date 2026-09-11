---
name: github-source
description: Fetch GitHub issues as Vibe Kanban source tickets and post blocking questions back to the issue with GitHub CLI.
---

# GitHub Source

Use this plugin when a source ticket is a GitHub issue: to read the issue into a Vibe Kanban work ticket, and, after the user confirms, to post blocking questions back to the issue.

Check readiness first; report `failed` and let the caller fall back when either check fails:

```bash
gh auth status
git remote -v
```

## Read an issue as a source ticket

Accepted references: `https://github.com/<owner>/<repo>/issues/<n>`, `<owner>/<repo>#<n>`, or `#<n>` when the current repository has a GitHub remote.

```bash
gh issue view <n> --repo <owner>/<repo> --json number,title,body,state,labels,assignees,url,comments,createdAt,updatedAt
```

Write the result onto the Vibe Kanban work ticket, not into a mirrored ticket:

- `--source-type github --source-id <owner>/<repo>#<n> --source-url <url>`
- `--source-snapshot @file`: title, state, labels, body, and the comment thread condensed to what changes requirements or acceptance.
- `--source-evidence @file`: every image URL found in the body or comments as `{ "type": "image", ... }` and every non-image link as `{ "type": "link", ... }`, labelled with where it came from (`issue body`, `comment by <login>`).

Record the fetch: `pnpm -s vk action-log <id> --action-type plugin:github-source --status triggered --url <issue-url> --description "Fetched issue <owner>/<repo>#<n>" --quiet`.

## Post blocking questions to the issue

Only after the user confirms. Post the `requirement` and `design` sections of the ticket's `open_questions` as one comment so product reviewers see them where the requirement lives; keep `technical` and `operations` sections for the developer or operations channel the user chooses:

```bash
gh issue comment <n> --repo <owner>/<repo> --body-file <questions.md>
```

The comment body starts with `Questions from Vibe Kanban VK-<id>` and lists the questions verbatim. Record the comment URL with `action-log --action-type plugin:github-source --status triggered --url <comment-url>` and keep the ticket on `hold`.

When the user later asks to check for answers, read new comments with `gh issue view <n> --json comments`, append each answer with `pnpm -s vk comment <id> --comment "<login>: <answer>" --actor user --quiet`, and let the owning workflow decide whether the questions are resolved.

## Do Not

- Create, close, or label GitHub issues.
- Post without the user's confirmation.
- Copy credentials or private attachment tokens into Vibe Kanban fields.
