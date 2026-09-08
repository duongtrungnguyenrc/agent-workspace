---
name: auto-us
description: Explicitly scan a project with CodeGraph to infer feature clusters and create Vibe Kanban US/use_case tickets on request.
---

# Auto US

Use this skill only when the user explicitly asks the agent to auto-generate, infer, scan, or bootstrap user stories/use cases from the current project. Do not invoke it implicitly during normal implementation, bug fixing, or story-writing from user-provided requirements.

## Goal

Infer a practical product map from the codebase and create Vibe Kanban tickets that help humans and agents understand existing feature areas.

## Source Exploration

Use CodeGraph first. Focus on entry points that reveal product features:

- app routes, screens, pages, controllers, handlers, and navigation
- sidebar, menu, tab, route registry, layout shell, and permission-gated feature modules
- API route groups, service boundaries, GraphQL resolvers, background jobs, and mobile screens
- existing tests or fixtures that describe workflows

Use native text search only for literal labels, menu text, route strings, or after CodeGraph identifies a specific file.

## Ticket Creation

Create Vibe Kanban tickets only after the feature clusters are clear enough to summarize.

Default structure:

```text
US
  use_case[]
```

- Create a `US` ticket for each coherent product capability or feature cluster.
- Create multiple `use_case` children when the feature has distinct actor goals, scenarios, workflow variants, or acceptance areas.
- Store codebase-derived evidence and assumptions in ticket `specification`.
- Use source fields to mark that the source is inferred from the repository, for example `source_type=codegraph` and a `source_snapshot` summarizing the scanned routes/modules.
- Do not create implementation `task` tickets unless the user also asks to implement. Auto-US is documentation discovery, not implementation planning.

If an inferred area is not user-story-shaped, ask before representing it as a top-level `task`, `uat_feedback`, or `qc_feedback` work ticket instead of forcing a `US/use_case` hierarchy.

## Upsert Behavior

Before creating tickets, list existing Vibe Kanban tickets and avoid duplicates. Prefer updating an existing inferred `US` or `use_case` when the title/source evidence clearly matches.

Use the project-local Vibe Kanban command:

```bash
node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs list --json
node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type US --title "<feature>" --specification "<markdown>" --source-type codegraph --source-snapshot "<evidence>"
node .codex/skills/vibe-kanban/scripts/vibe-kanban.mjs create --type use_case --parent-id <us-id> --title "<Verb Noun>" --specification "<markdown>" --source-type codegraph --source-snapshot "<evidence>"
```

Return the created or updated hierarchy with ticket IDs and the main code evidence used for each cluster.
