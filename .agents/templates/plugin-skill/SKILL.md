---
name: my-plugin
description: One sentence, starting with a verb, that says what this plugin does and through which system, so an agent can judge when it fits a decision.
---

# My Plugin

Every skill in this workspace is a plugin. Core workflows do not look plugins up in a registry; they read the installed skills' descriptions at decision points (source tickets, blocking questions, notifications, code exploration, design context, review, delivery) and propose the ones that fit. Keep the description above precise enough for that judgement.

Use this plugin when <situation, for example: the project tracks requirements in Teams and a ticket has open questions>.

## Steps

1. Confirm the required tool, CLI, or MCP server responds; if not, say so and let the caller fall back to the chat.
2. Perform the action with exact commands or tool calls. Ask the user first when the action posts to a human channel or external system.
3. Write results back to the ticket, for example `pnpm -s vk update <id> --source-snapshot @file` or `pnpm -s vk comment <id> --comment "<answer>" --actor user --quiet`.
4. Record the outcome: `pnpm -s vk action-log <id> --action-type plugin:my-plugin --status <triggered|skipped|failed> --url <url> --description "<what happened>" --quiet`.

## Do Not

- Store data outside Vibe Kanban.
- Post to a human channel without the user's confirmation.
